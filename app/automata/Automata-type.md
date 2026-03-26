### DO NOT DELETE!

## This is the keep track of the automata features which i willing to add into the future

---

## Legend

* ⚪ To-do / Planned
* 🟡 In Progress
* 🟢 Completed
* 🔴 Cancelled
* 🔵 N/A

### Finite Automata (Type 3)
### DO NOT DELETE!

## Overview

This file tracks automata features planned for the project. The list is grouped by classical Chomsky/automata types and a separate "Other / Advanced" section for ω-automata, timed, probabilistic, and other specialized models.

---

## Legend

- ⚪ To-do / Planned
- 🟡 In Progress
- 🟢 Completed
- 🔴 Cancelled
- 🔵 N/A

---

## Type 3 — Regular languages (Finite Automata)

- 🟢 Standard Finite Automata
  - 🟢 Deterministic (DFA)
  - 🟢 Non-Deterministic (NFA)
  - 🟢 NFA with ε-transitions (ε-NFA)
- ⚪ Two-way Finite Automata
  - ⚪ Two-way Deterministic
  - ⚪ Two-way Non-Deterministic
- ⚪ Multi-head Finite Automata
  - ⚪ Deterministic
  - ⚪ Non-Deterministic
- ⚪ Alternating Finite Automata

---

## Type 2 — Context-free languages (Pushdown Automata)

- 🟢 Pushdown Automata (PDA)
  - 🟢 Deterministic PDA
  - 🟢 Non-Deterministic PDA
  - 🔵 ε-moves (handled / N/A depending on model)
- 🟢 PDA Acceptance Modes
  - 🟢 Final State Acceptance
  - 🟢 Empty Stack Acceptance
  - 🟢 Both (Final State AND Empty Stack)

---

## Type 1 — Context-sensitive languages (Linear-bounded Automata)

- 🟢 Linear-Bounded Automata (LBA)
  - 🟢 Deterministic LBA
  - 🟢 Non-Deterministic LBA

---

## Type 0 — Recursively enumerable languages (Turing Machines)

- 🟢 Deterministic Turing Machine (DTM)
- 🟢 Non-Deterministic Turing Machine (NDTM)
- 🟢 TM Acceptance Modes
  - 🟢 Final State Acceptance
  - 🟢 Halt in Accepting State

---

## ω-Automata, Timed & Other Infinite/Real-time Models

- 🟢 Büchi Automata (ω-automata)
  - 🟢 Basic simulation on finite prefixes
  - ⚪ Full cycle detection for infinite word acceptance
- 🟢 Timed Automata
  - 🟢 Basic structure with clock constraints
  - ⚪ Full clock semantics implementation

---

## Transducers, Machines & Variants

- ⚪ Finite State Transducer
- 🟢 Mealy Machine (output on transitions)
- 🟢 Moore Machine (output on states)


---

## Probabilistic / Weighted / Advanced Models

- ⚪ Probabilistic Automata / Markov Models
- ⚪ Weighted Automata (max-plus / min-plus)
- ⚪ Visibly Pushdown Automata
- ⚪ Quantum Finite Automata

---

## Research / Future / Misc (Scrap)

- ⚪ Hybrid Automata
- ⚪ Register Automata
- ⚪ Parity / Rabin / Streett Automata
- ⚪ Learning Automata
- ⚪ Hidden Markov Models

---

### Notes

- The list above groups models by classical language types first (Type 3 → Type 0), then by specialized families. Use these sections to track implementation status or link to example files in `public/examples` or `app/automata/visualizer/example`.

### Emoji / color legend (reference)
- 🔴 U+1F534  🔵 U+1F535  🟠 U+1F7E0  🟡 U+1F7E1  🟢 U+1F7E2  🟣 U+1F7E3
- 🟤 U+1F7E4  ⚫ U+26AB  ⚪ U+26AA  🟥 U+1F7E5  🟦 U+1F7E6