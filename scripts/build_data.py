#!/usr/bin/env python3
"""Convert the theory-test .docx into src/data/questions.json + public/media/*.

Usage: python3 -I scripts/build_data.py "<path to .docx>"

Each question in the document is a 2-column table row:
  left  = "N. question", "a) ..." options (correct one ends with ✔),
          optional "Answer to confirm: ..." note, optional pictures from the bank
  right = a picture illustrating the correct answer
"""
import json, os, re, shutil, subprocess, sys, tempfile, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_JSON = os.path.join(ROOT, "src", "data", "questions.json")
OUT_MEDIA = os.path.join(ROOT, "public", "media")
CHECK = "✔"

# Questions whose answers are given as four pictures (a-d in order).
PICTURE_OPTIONS = {
    226: {"answer": 3},
    235: {"answer": 3},
    236: {"answer": 1, "note": "No answer was marked in the source; (b) is the only sign that bans motor vehicles."},
    249: {"answer": 3, "note": "The source marks (d). In real life the 'give way' sign is an inverted (upside-down) triangle."},
}

TOPICS = [
    ("safety", "Safety & emergencies", r"accident|collision|injur|emergency|breakdown|broken down|warning triangle|alcohol|drink|phone|seat ?belt|helmet|tired|fatigue|first aid|fire\b|skid|aquaplan"),
    ("signs", "Road signs", r"\bsigns?\b|this signal|these signals|signals? (means?|indicates?|announces?|prohibits?|obliges?|prevents?|authori[sz]es?)|road signs?|danger signal|signali[sz]ation|panel|shape"),
    ("markings", "Road markings", r"marking|\blines?\b|arrows?|zebra|\blanes?\b|cycle track|kerb"),
    ("overtaking", "Overtaking", r"overtak"),
    ("priority", "Priority & junctions", r"priority|give way|giving way|junction|crossroads?|cross road|intersection|roundabout|right of way|traffic lights?"),
    ("speed", "Speed limits", r"speed|km/h|km / h|kmh|km per hour"),
    ("lights", "Lights & visibility", r"\blights?\b|headlights?|beam|lamps?|reflectors?|\bfog|night|visib|flashing"),
    ("parking", "Stopping & parking", r"\bpark|\bstop(ping)?\b|\bhalt|stationary"),
    ("vehicle", "Vehicle, loads & documents", r"trailer|width|length|weight|tonnes?|axles?|brakes?|tyres?|tires?|wipers?|mirror|\bloads?\b|inspect|horn|alarm|licen[cs]e|insurance|documents?|registration|plate|equipment|bandages|wheels?"),
]


def norm(s: str) -> str:
    s = s.replace(" ", " ").replace("\t", " ")
    s = re.sub(r"\s+", " ", s).strip()
    s = re.sub(r"\s+([:;,.?])", r"\1", s)
    fixes = {
        "arecorrect": "are correct", "whoseauthorized": "whose authorized", "winscreen": "windscreen",
        "switched of ": "switched off ", "tones": "tonnes", "tone": "tonne", "2tonnes": "2 tonnes",
        "24tonnes": "24 tonnes", "11meters": "11 meters", "1meter": "1 meter", "20meters": "20 meters",
        "100meters": "100 meters", "Aucune des réponses n'est correcte.": "None of the answers is correct",
        " et c sont corrects": " and c are correct",
    }
    for a, b in fixes.items():
        s = s.replace(a, b)
    s = re.sub(r"(\d)(tonnes?|meters?|km\b)", r"\1 \2", s)  # "1tonnes" -> "1 tonnes"
    s = re.sub(r"\b1 tonnes\b", "1 tonne", s)
    s = re.sub(r",(?=[A-Za-z])", ", ", s)  # "color,white" -> "color, white"
    return s


def classify(stem: str, options: str) -> str:
    stem, options = stem.lower(), options.lower()
    best, best_score = "rules", 0
    for key, _, pat in TOPICS:
        score = 3 * len(re.findall(pat, stem)) + len(re.findall(pat, options))
        if score > best_score:
            best, best_score = key, score
    return best


def parse_cell(cell, rels):
    out = []
    for p in re.findall(r"<w:p[ >].*?</w:p>", cell, re.S):
        t = "".join(re.findall(r"<w:t[^>]*>([^<]*)</w:t>", p))
        imgs = [rels[r] for r in re.findall(r'r:embed="(rId\d+)"', p) if r in rels]
        if t.strip() or imgs:
            out.append((t, imgs))
    return out


def main(docx):
    tmp = tempfile.mkdtemp()
    with zipfile.ZipFile(docx) as z:
        z.extractall(tmp)
    xml = open(os.path.join(tmp, "word", "document.xml"), encoding="utf8").read()
    rels = dict(re.findall(r'Id="(rId\d+)"[^>]*Target="([^"]+)"',
                           open(os.path.join(tmp, "word", "_rels", "document.xml.rels"), encoding="utf8").read()))

    used_media = set()
    questions = []
    for row in re.findall(r"<w:tr[ >].*?</w:tr>", xml, re.S):
        cells = re.findall(r"<w:tc>.*?</w:tc>", row, re.S)
        if len(cells) != 2:
            continue
        left, right = parse_cell(cells[0], rels), parse_cell(cells[1], rels)
        if not left or not re.match(r"\s*\d+\.", left[0][0]):
            continue
        num = int(re.match(r"\s*(\d+)\.", left[0][0]).group(1))
        stem = norm(re.sub(r"^\s*\d+\.\s*", "", left[0][0]))
        opts, notes, explanation, qimgs = [], [], None, []
        for t, imgs in left[1:]:
            qimgs += imgs
            s = t.strip()
            if not s:
                continue
            if s.lower().startswith("answer to confirm"):
                notes.append(norm(s.split(":", 1)[1]))
            elif re.match(r"^e\)\s*Explanation", s):
                explanation = norm(re.sub(r"^e\)\s*Explanation:?", "", s))
            elif re.match(r"^\(?[a-e]\s?\)", s):
                opts.append(s)
        answer_imgs = [i for _, imgs in right for i in imgs]

        options, answer = [], None
        if num in PICTURE_OPTIONS:
            spec = PICTURE_OPTIONS[num]
            options = [{"text": f"Picture {'abcd'[i]}", "image": None} for i in range(4)]
            for i, img in enumerate(qimgs[:4]):
                options[i]["image"] = img
            qimgs = qimgs[4:]
            answer = spec["answer"]
            if "note" in spec:
                notes = [spec["note"]]
        else:
            raw = []
            for s in opts:
                body = re.sub(r"^\(?[a-e]\s?\)\s*", "", s)
                ok = CHECK in body
                raw.append((norm(body.replace(CHECK, "")), ok))
            # Source quirks: stems that spilled into the first option line.
            if num == 86:
                stem = stem + " " + raw[0][0]
                raw = raw[1:]
            elif num == 346:
                stem = stem + " overtake:"
                raw = raw[1:]
            elif num == 354:
                stem = "The rear view mirror is used:"
                raw = raw[1:]
            elif num == 428:
                raw = [raw[0], (raw[1][0] + " " + raw[2][0], raw[1][1] or raw[2][1])] + raw[3:]
            options = [{"text": t, "image": None} for t, _ in raw]
            marks = [i for i, (_, ok) in enumerate(raw) if ok]
            answer = marks[0] if marks else None
        if answer is None:
            print(f"!! question {num}: no answer", file=sys.stderr)
            continue

        q = {
            "id": num,
            "q": stem,
            "options": options,
            "answer": answer,
            "topic": classify(stem, " ".join(o["text"] for o in options)),
            "images": qimgs,
            "answerImage": answer_imgs[0] if answer_imgs else None,
        }
        if explanation:
            q["explanation"] = explanation
        if notes:
            q["disputed"] = True
            q["note"] = " ".join(notes)
        for img in qimgs + answer_imgs + [o["image"] for o in options if o["image"]]:
            used_media.add(img)
        questions.append(q)

    # Copy and optimise only the media that questions use.
    if os.path.isdir(OUT_MEDIA):
        shutil.rmtree(OUT_MEDIA)
    os.makedirs(OUT_MEDIA)
    rename = {}
    for rel in sorted(used_media):
        src = os.path.join(tmp, "word", rel)
        base, ext = os.path.splitext(os.path.basename(rel))
        ext = ext.lower()
        if ext == ".png" and os.path.getsize(src) > 120_000:
            dst_name = base + ".jpg"
            subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", "78", "-Z", "960",
                            src, "--out", os.path.join(OUT_MEDIA, dst_name)], check=True, capture_output=True)
        else:
            dst_name = base + ext
            shutil.copy(src, os.path.join(OUT_MEDIA, dst_name))
        rename[rel] = "media/" + dst_name

    for q in questions:
        q["images"] = [rename[i] for i in q["images"]]
        q["answerImage"] = rename.get(q["answerImage"]) if q["answerImage"] else None
        for o in q["options"]:
            if o["image"]:
                o["image"] = rename[o["image"]]
            else:
                del o["image"]

    os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
    topics = [{"id": k, "name": n} for k, n, _ in TOPICS] + [{"id": "rules", "name": "General traffic rules"}]
    with open(OUT_JSON, "w", encoding="utf8") as f:
        json.dump({"topics": topics, "questions": questions}, f, ensure_ascii=False, indent=1)
    shutil.rmtree(tmp)

    from collections import Counter
    print(f"{len(questions)} questions, {len(rename)} images")
    print(Counter(q["topic"] for q in questions))
    print("disputed:", sum(1 for q in questions if q.get("disputed")))


if __name__ == "__main__":
    main(sys.argv[1])
