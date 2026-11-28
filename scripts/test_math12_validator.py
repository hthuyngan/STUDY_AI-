#!/usr/bin/env python3
"""Negative & positive unit tests for Phase 14 real mathematical validator."""
from math12_audit_all_records import validate_question


def run_tests():
    # 1. Wrong answer with valid structure -> FAILED
    r1 = validate_question({
        "id": "neg_wrong_ans",
        "type": "multiple-choice",
        "prompt": "Tính đạo hàm của $f(x)=x^2$ tại $x=3$.",
        "options": ["$3$", "$6$", "$9$", "$12$"],
        "correctAnswer": "$9$",
        "explanation": "Đạo hàm $f'(x)=2x$, tại $x=3$ giá trị là $6$.",
        "verificationSpec": {"kind": "derivative_at", "expr": "x**2", "at": "3"},
    })
    assert r1["reviewStatus"] == "FAILED" and any("MATH_MISMATCH" in e for e in r1["errors"]), r1

    # 2. Duplicate options -> FAILED
    r2 = validate_question({
        "id": "neg_dup_opts",
        "type": "multiple-choice",
        "prompt": "Giá trị cực tiểu của $y=x^3-3x^2+4$ là?",
        "options": ["$0$", "$4$", "$4$", "$0$"],
        "correctAnswer": "$0$",
        "explanation": "Cực tiểu tại $x=2$ cho $y=0$.",
    })
    assert r2["reviewStatus"] == "FAILED" and "DUPLICATE_OPTIONS" in r2["errors"], r2

    # 3. Equivalent options -> FAILED
    r3 = validate_question({
        "id": "neg_equiv_opts",
        "type": "multiple-choice",
        "prompt": "Tính $\\int_0^1 x\\,dx$.",
        "options": ["$1/2$", "$0.5$", "$1$", "$2$"],
        "correctAnswer": "$1/2$",
        "explanation": "Tích phân bằng $1/2$.",
    })
    assert r3["reviewStatus"] == "FAILED" and "EQUIVALENT_OPTIONS" in r3["errors"], r3

    # 4. Unbalanced KaTeX -> FAILED
    r4 = validate_question({
        "id": "neg_katex",
        "type": "short-answer",
        "prompt": "Tính $x^2 + 1",
        "correctAnswer": "5",
        "explanation": "Thay $x=2$ được $5$.",
    })
    assert r4["reviewStatus"] == "FAILED" and "KATEX_UNBALANCED" in r4["errors"], r4

    # 5. Dangling reference -> FAILED
    r5 = validate_question({
        "id": "neg_dangling",
        "type": "short-answer",
        "prompt": "Tìm cực trị của hàm số trên tại $x=1$.",
        "correctAnswer": "2",
        "explanation": "Kết quả là $2$.",
    })
    assert r5["reviewStatus"] == "FAILED" and "DANGLING_REFERENCE" in r5["errors"], r5

    # 6. True-false-group invalid key -> FAILED
    r6 = validate_question({
        "id": "neg_tfg",
        "type": "true-false-group",
        "prompt": "Xét hàm số $y=x^2$:",
        "options": ["a) $y'=2x$", "b) $y(1)=1$", "c) $y(0)=0$"],
        "correctAnswer": "Đ,S",
        "explanation": "Chỉ có 3 ý.",
    })
    assert r6["reviewStatus"] == "FAILED" and "TFG_MUST_HAVE_4_STATEMENTS" in r6["errors"], r6

    # 7. Positive independent SymPy verification -> MATH_AUTO_VERIFIED
    r7 = validate_question({
        "id": "pos_sympy",
        "type": "multiple-choice",
        "prompt": "Giá trị cực tiểu của hàm số $y=x^3-3x^2+4$ là?",
        "options": ["$0$", "$1$", "$2$", "$4$"],
        "correctAnswer": "$0$",
        "explanation": "Ta có $y'=3x^2-6x=0 \\Leftrightarrow x=0$ hoặc $x=2$. Tại $x=2$, $y''=6>0$ nên $y_{CT}=0$.",
        "verificationSpec": {"kind": "extrema_value", "expr": "x**3 - 3*x**2 + 4", "mode": "min"},
    })
    assert r7["reviewStatus"] == "MATH_AUTO_VERIFIED" and r7["computedAnswer"] == "0", r7

    # 8. Code injection attempt in verificationSpec must be rejected without executing
    r8 = validate_question({
        "id": "neg_injection",
        "type": "short-answer",
        "prompt": "Tính $1+1$.",
        "correctAnswer": "2",
        "explanation": "1+1=2.",
        "verificationSpec": {"kind": "eval_expr", "expr": "__import__('os').system('echo PWNED')"},
    })
    assert r8["reviewStatus"] == "FAILED" and "SYMPY_SPEC_COMPUTE_FAILED" in r8["errors"], r8

    # 9. Unequal vector lengths in vector_dot -> FAILED (M12-REVIEW-01)
    r9 = validate_question({
        "id": "neg_vec_len",
        "type": "short-answer",
        "prompt": "Tính tích vô hướng.",
        "correctAnswer": "5",
        "explanation": "1*2 + 1*3 = 5.",
        "verificationSpec": {"kind": "vector_dot", "u": [1, 1], "v": [2, 3, 99]},
    })
    assert r9["reviewStatus"] == "FAILED" and "SYMPY_SPEC_COMPUTE_FAILED" in r9["errors"], r9

    # 10. Dangling lesson/assessment reference -> FAILED (M12-REVIEW-02)
    r10 = validate_question(
        {
            "id": "neg_dangling_id",
            "lessonId": "les_nonexistent",
            "type": "short-answer",
            "prompt": "Tính $1+1$.",
            "correctAnswer": "2",
            "explanation": "1+1=2.",
            "verificationSpec": {"kind": "eval_expr", "expr": "1+1"},
        },
        lesson_ids={"les_math12_c1_b1"},
    )
    assert r10["reviewStatus"] == "FAILED" and "DANGLING_LESSON_ID" in r10["errors"], r10

    print("MATH12_VALIDATOR_TESTS: 10 PASS, 0 FAIL")


if __name__ == "__main__":
    run_tests()
