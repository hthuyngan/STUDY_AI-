#!/usr/bin/env python3
"""
PHASE 14: Real Mathematical, Structural & KaTeX Validation for backend/data/math12/.
- Never copies correctAnswer into computedAnswer.
- Never uses eval() on untrusted strings.
- Validates:
  1. Structural integrity (required fields, lesson/chapter/assessment refs, no dangling refs).
  2. KaTeX render safety (balanced $...$, $$...$$, {...}, \frac, \sqrt).
  3. Multiple-choice option uniqueness & symbolic equivalence via SymPy.
  4. True-false-group 4-statement integrity.
  5. Short-answer exact numeric / rational parsing via SymPy.
  6. Independent SymPy computation when `verificationSpec` is provided; otherwise marks HUMAN_REVIEW_REQUIRED (never fakes MATH_AUTO_VERIFIED).
"""
import ast
import json
import hashlib
import re
from pathlib import Path
from datetime import datetime, timezone
import sympy as sp

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "backend" / "data" / "math12"

DANGLING_PATTERNS = [
    r"mẫu\s+(?:ghép\s+nhóm\s+)?trên",
    r"số\s+liệu\s+trên",
    r"hàm\s+số\s+trên",
    r"bài\s+toán\s+trên",
    r"bảng\s+trên",
    r"hình\s+trên",
]

SAFE_LOCALS = {
    "x": sp.Symbol("x", real=True),
    "y": sp.Symbol("y", real=True),
    "t": sp.Symbol("t", real=True),
    "n": sp.Symbol("n", real=True),
    "pi": sp.pi,
    "e": sp.E,
    "sqrt": sp.sqrt,
    "sin": sp.sin,
    "cos": sp.cos,
    "tan": sp.tan,
    "ln": sp.log,
    "log": sp.log,
    "exp": sp.exp,
    "Abs": sp.Abs,
}

SAFE_FUNCS = {
    "sqrt": sp.sqrt,
    "sin": sp.sin,
    "cos": sp.cos,
    "tan": sp.tan,
    "ln": sp.log,
    "log": sp.log,
    "exp": sp.exp,
    "Abs": sp.Abs,
}


def safe_ast_to_sympy(text: str):
    """Non-evaluating strict AST -> SymPy converter. Rejects calls/attrs/imports/subscripts."""
    s = (text or "").strip().replace("^", "**")
    if not s or len(s) > 256:
        return None
    try:
        tree = ast.parse(s, mode="eval")
    except SyntaxError:
        return None

    def _conv(node):
        if isinstance(node, ast.Expression):
            return _conv(node.body)
        if isinstance(node, ast.Constant):
            if isinstance(node.value, (int, float)) and not isinstance(node.value, bool):
                return sp.Rational(str(node.value)) if isinstance(node.value, float) else sp.Integer(node.value)
            raise ValueError("Disallowed constant")
        if isinstance(node, ast.Name):
            if node.id in SAFE_LOCALS and node.id not in SAFE_FUNCS:
                return SAFE_LOCALS[node.id]
            raise ValueError(f"Disallowed name: {node.id}")
        if isinstance(node, ast.UnaryOp):
            operand = _conv(node.operand)
            if isinstance(node.op, ast.UAdd):
                return +operand
            if isinstance(node.op, ast.USub):
                return -operand
            raise ValueError("Disallowed unary op")
        if isinstance(node, ast.BinOp):
            left, right = _conv(node.left), _conv(node.right)
            if isinstance(node.op, ast.Add):
                return left + right
            if isinstance(node.op, ast.Sub):
                return left - right
            if isinstance(node.op, ast.Mult):
                return left * right
            if isinstance(node.op, ast.Div):
                return left / right
            if isinstance(node.op, ast.Pow):
                return left ** right
            raise ValueError("Disallowed binary op")
        if isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name) and node.func.id in SAFE_FUNCS and not node.keywords:
                args = [_conv(a) for a in node.args]
                return SAFE_FUNCS[node.func.id](*args)
            raise ValueError("Disallowed call")
        raise ValueError(f"Disallowed AST node: {type(node).__name__}")

    try:
        return _conv(tree)
    except Exception:
        return None


def strip_math_delimiters(text: str) -> str:
    s = (text or "").strip()
    if s.startswith("$$") and s.endswith("$$") and len(s) >= 4:
        s = s[2:-2].strip()
    elif s.startswith("$") and s.endswith("$") and len(s) >= 2:
        s = s[1:-1].strip()
    return s


def latex_to_sympy_expr(text: str):
    s = strip_math_delimiters(text)
    if not s:
        return None
    s = re.sub(r"\\frac\{([^{}]+)\}\{([^{}]+)\}", r"((\1)/(\2))", s)
    s = re.sub(r"\\sqrt\{([^{}]+)\}", r"sqrt(\1)", s)
    s = s.replace("\\cdot", "*").replace("\\times", "*").replace(",", ".")
    # Insert explicit * for implicit multiplication like 2x or 3(x+1)
    s = re.sub(r"(\d)([a-zA-Z(])", r"\1*\2", s)
    if "\\" in s or ";" in s:
        return None
    return safe_ast_to_sympy(s)


def check_katex_balance(text: str) -> bool:
    if not text:
        return True
    if text.count("$") % 2 != 0:
        return False
    # Check brace balance inside $...$ segments
    segments = re.findall(r"\$\$?(.*?)\$\$?", text, re.DOTALL)
    for seg in segments:
        depth = 0
        for ch in seg:
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth < 0:
                    return False
        if depth != 0:
            return False
    return True


def compute_independent_answer(spec: dict):
    """Independently compute answer from a structured verificationSpec using SymPy (no eval)."""
    if not isinstance(spec, dict):
        return None
    kind = spec.get("kind")
    x = SAFE_LOCALS["x"]
    try:
        if kind == "derivative_at":
            expr = safe_ast_to_sympy(spec["expr"])
            pt = safe_ast_to_sympy(str(spec["at"]))
            if expr is None or pt is None:
                return None
            val = sp.simplify(sp.diff(expr, x).subs(x, pt))
            return str(val)
        if kind == "definite_integral":
            expr = safe_ast_to_sympy(spec["expr"])
            a = safe_ast_to_sympy(str(spec["lower"]))
            b = safe_ast_to_sympy(str(spec["upper"]))
            if expr is None or a is None or b is None:
                return None
            val = sp.simplify(sp.integrate(expr, (x, a, b)))
            return str(val)
        if kind == "extrema_value":
            expr = safe_ast_to_sympy(spec["expr"])
            if expr is None:
                return None
            crit = sp.solve(sp.diff(expr, x), x)
            d2 = sp.diff(expr, x, 2)
            target_mode = spec.get("mode", "min")
            vals = []
            for c in crit:
                if c.is_real is False:
                    continue
                sec = d2.subs(x, c)
                if target_mode == "min" and sec > 0:
                    vals.append(sp.simplify(expr.subs(x, c)))
                elif target_mode == "max" and sec < 0:
                    vals.append(sp.simplify(expr.subs(x, c)))
            if vals:
                return str(vals[0])
        if kind == "vector_dot":
            u_raw = spec.get("u")
            v_raw = spec.get("v")
            if not isinstance(u_raw, list) or not isinstance(v_raw, list) or len(u_raw) == 0 or len(u_raw) != len(v_raw):
                return None
            u = [sp.Rational(v) for v in u_raw]
            v = [sp.Rational(w) for w in v_raw]
            return str(sum(a * b for a, b in zip(u, v)))
        if kind == "eval_expr":
            expr = safe_ast_to_sympy(spec["expr"])
            if expr is None:
                return None
            return str(sp.simplify(expr))
    except Exception:
        return None
    return None


def validate_question(q: dict, lesson_ids=None, chapter_ids=None, assessment_ids=None) -> dict:
    qid = q.get("id", "<missing>")
    qtype = q.get("type", "")
    prompt = q.get("prompt") or ""
    explanation = q.get("explanation") or ""
    correct = str(q.get("correctAnswer") or "").strip()
    options = q.get("options") or []
    errors = []

    if not prompt.strip() or not correct or not explanation.strip():
        errors.append("MISSING_REQUIRED_FIELD")

    if lesson_ids is not None and q.get("lessonId") and q.get("lessonId") not in lesson_ids:
        errors.append("DANGLING_LESSON_ID")
    if chapter_ids is not None and q.get("chapterId") and q.get("chapterId") not in chapter_ids:
        errors.append("DANGLING_CHAPTER_ID")
    if assessment_ids is not None and q.get("assessmentId") and q.get("assessmentId") not in assessment_ids:
        errors.append("DANGLING_ASSESSMENT_ID")

    has_dangling = any(re.search(pat, prompt, re.IGNORECASE) for pat in DANGLING_PATTERNS)
    if has_dangling:
        errors.append("DANGLING_REFERENCE")

    katex_ok = check_katex_balance(prompt) and check_katex_balance(explanation) and all(
        check_katex_balance(str(o)) for o in options
    )
    if not katex_ok:
        errors.append("KATEX_UNBALANCED")

    # Type-specific checks
    if qtype == "multiple-choice":
        if len(options) < 2:
            errors.append("INSUFFICIENT_OPTIONS")
        norm_opts = [re.sub(r"\s+", " ", str(o).strip()) for o in options]
        if len(norm_opts) != len(set(norm_opts)):
            errors.append("DUPLICATE_OPTIONS")
        if correct not in [str(o).strip() for o in options]:
            errors.append("CORRECT_ANSWER_NOT_IN_OPTIONS")
        # Symbolic equivalence check across options
        parsed_opts = [latex_to_sympy_expr(str(o)) for o in options]
        for i in range(len(parsed_opts)):
            for j in range(i + 1, len(parsed_opts)):
                if parsed_opts[i] is not None and parsed_opts[j] is not None:
                    try:
                        if sp.simplify(parsed_opts[i] - parsed_opts[j]) == 0:
                            errors.append("EQUIVALENT_OPTIONS")
                    except Exception:
                        pass

    elif qtype == "true-false-group":
        if len(options) != 4:
            errors.append("TFG_MUST_HAVE_4_STATEMENTS")
        norm_opts = [re.sub(r"\s+", " ", str(o).strip()) for o in options]
        if len(norm_opts) != len(set(norm_opts)):
            errors.append("DUPLICATE_STATEMENTS")
        parts = [p.strip().upper() for p in re.split(r"[,;|]+", correct) if p.strip()]
        if len(parts) != 4 or not all(p in {"Đ", "S", "T", "F", "TRUE", "FALSE", "ĐÚNG", "SAI"} for p in parts):
            errors.append("TFG_INVALID_ANSWER_KEY")

    elif qtype == "short-answer":
        parsed_ans = latex_to_sympy_expr(correct)
        if parsed_ans is None and not re.match(r"^-?\d+(?:[.,]\d+)?$", correct):
            errors.append("SHORT_ANSWER_UNPARSEABLE")

    # Independent mathematical computation (only when verificationSpec is present)
    computed = None
    spec = q.get("verificationSpec")
    if spec:
        computed = compute_independent_answer(spec)
        if computed is None:
            errors.append("SYMPY_SPEC_COMPUTE_FAILED")
        else:
            exp_expr = latex_to_sympy_expr(correct)
            comp_expr = latex_to_sympy_expr(computed)
            if exp_expr is not None and comp_expr is not None:
                if sp.simplify(exp_expr - comp_expr) != 0:
                    errors.append(f"MATH_MISMATCH(expected={correct},computed={computed})")
            elif strip_math_delimiters(correct) != computed:
                errors.append(f"MATH_MISMATCH(expected={correct},computed={computed})")

    if errors:
        status = "FAILED"
    elif computed is not None:
        status = "MATH_AUTO_VERIFIED"
    else:
        status = "HUMAN_REVIEW_REQUIRED"

    content_hash = hashlib.sha256(
        json.dumps({"prompt": prompt, "options": options, "correctAnswer": correct}, ensure_ascii=False, sort_keys=True).encode("utf-8")
    ).hexdigest()

    return {
        "recordId": qid,
        "recordType": "question",
        "lessonId": q.get("lessonId"),
        "questionType": qtype,
        "verificationMethod": "sympy_independent_v2" if computed is not None else "structural_and_katex_only",
        "expectedAnswer": correct,
        "computedAnswer": computed,
        "selfContained": not has_dangling,
        "katexBalanced": katex_ok,
        "errors": errors,
        "sourceReferences": [q.get("sourceId", "SRC-STUDYAI-ORIG-2026")],
        "contentHash": content_hash,
        "reviewStatus": status,
    }


def main():
    questions = json.loads((DATA_DIR / "questions" / "math12_questions.json").read_text(encoding="utf-8"))
    curriculum = json.loads((DATA_DIR / "curriculum.json").read_text(encoding="utf-8"))
    lessons = curriculum["lessons"]
    lesson_ids = {l["id"] for l in lessons}
    chapter_ids = {c["id"] for c in curriculum["chapters"]}
    assessments = json.loads((DATA_DIR / "assessments" / "math12_assessments.json").read_text(encoding="utf-8"))
    assessment_ids = {a["id"] for a in assessments}
    blocks = json.loads((DATA_DIR / "lessons" / "math12_lesson_blocks.json").read_text(encoding="utf-8"))

    records = [validate_question(q, lesson_ids=lesson_ids, chapter_ids=chapter_ids, assessment_ids=assessment_ids) for q in questions]
    summary = {
        "MATH_AUTO_VERIFIED": sum(1 for r in records if r["reviewStatus"] == "MATH_AUTO_VERIFIED"),
        "HUMAN_REVIEW_REQUIRED": sum(1 for r in records if r["reviewStatus"] == "HUMAN_REVIEW_REQUIRED"),
        "FAILED": sum(1 for r in records if r["reviewStatus"] == "FAILED"),
        "failedRecords": [{"id": r["recordId"], "errors": r["errors"]} for r in records if r["reviewStatus"] == "FAILED"],
    }
    manifest_out = {
        "datasetVersion": "1.1.0",
        "auditedAt": datetime.now(timezone.utc).isoformat(),
        "sympyVersion": sp.__version__,
        "totalQuestions": len(questions),
        "totalLessons": len(lessons),
        "totalLessonBlocks": len(blocks),
        "summary": summary,
        "records": records,
    }
    (DATA_DIR / "validation_manifest.json").write_text(json.dumps(manifest_out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
