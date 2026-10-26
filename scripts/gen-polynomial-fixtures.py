# /// script
# requires-python = ">=3.11"
# dependencies = ["scipy>=1.11"]
# ///
"""
Reference values for src/lib/orbital/{laguerre,legendre}.ts, computed with SciPy.

    uv run scripts/gen-polynomial-fixtures.py

Writes src/lib/orbital/__fixtures__/polynomials.json. Commit the output; the
vitest suite compares against it so SciPy is only needed to regenerate.
"""

import json
from pathlib import Path

import numpy as np
from scipy.special import eval_genlaguerre, lpmv

N_MAX = 10  # hydrogen shells covered (the app uses n <= 6)
OUT = Path(__file__).resolve().parent.parent / "src/lib/orbital/__fixtures__/polynomials.json"


def laguerre_cases():
    cases = []
    # Hydrogen domain: k = n-l-1, alpha = 2l+1, x = 2r/n out past the density tail.
    for n in range(1, N_MAX + 1):
        for l in range(n):
            k, alpha = n - l - 1, 2 * l + 1
            xs = np.linspace(0, 4 * n + 20, 41)
            cases.append({"k": k, "alpha": alpha, "x": xs.tolist(),
                          "value": eval_genlaguerre(k, alpha, xs).tolist()})
    # A few non-hydrogen alphas to exercise the general recurrence.
    for alpha in (0.0, 0.5, 2.0):
        for k in range(0, 6):
            xs = np.linspace(0, 15, 16)
            cases.append({"k": k, "alpha": alpha, "x": xs.tolist(),
                          "value": eval_genlaguerre(k, alpha, xs).tolist()})
    return cases


def legendre_cases():
    cases = []
    xs = np.concatenate([np.linspace(-1, 1, 41), np.cos(np.linspace(0, np.pi, 13))])
    for l in range(N_MAX):
        for m in range(l + 1):
            # lpmv includes the Condon-Shortley phase, matching the TS implementation.
            cases.append({"l": l, "m": m, "x": xs.tolist(),
                          "value": lpmv(m, l, xs).tolist()})
    return cases


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    data = {"laguerre": laguerre_cases(), "legendre": legendre_cases()}
    OUT.write_text(json.dumps(data) + "\n")
    print(f"wrote {OUT} ({len(data['laguerre'])} laguerre, {len(data['legendre'])} legendre cases)")


if __name__ == "__main__":
    main()
