# Research Workflow Toolkit (Persian-first) — v0.3.0-rc1

An **adaptable research-process toolkit**, not an autonomous research agent. Includes twelve modular research-stage workflows, editable Persian Markdown prompts, structured JSON manifests, human-approval gates, offline validation code, synthetic demonstrations, and one real open-access source-audit example (not an agentic run).

Start with [Persian README](README.md), [selection guide](docs/01-start-here.md), and [workflow library](docs/02-research-lifecycle.md). Use `python tools/validate.py` and `python -m unittest discover -s tests -v` locally. Agentic capabilities are conditional on the actual platform and permissions; this repository does **not** deploy or test ChatGPT Work/Chat automation.

Content: CC BY 4.0. Code: MIT. Not affiliated with or endorsed by OpenAI or GitHub.

## Interactive Persian-first studio (release candidate)

The [offline, no-code workflow designer](docs/index.html) builds structured research plans, job cards and JSON manifests locally in your browser using canonical workflow definitions. It does not perform research, send data to a service, run ChatGPT Work, grant approvals or independently validate scientific claims. See the [Studio guide](docs/10-studio-guide.md).

Run `python tools/generate_studio_catalog.py --check` and `node --test tests/test_studio.cjs` alongside the original Python checks. A human study or live multi-agent pilot has **not** been completed.
