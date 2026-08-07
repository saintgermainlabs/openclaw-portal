export interface KBEntry {
  id: string
  title: string
  category: string
  tags: string[]
  updated: string
  content: string
}

export const KB_CATEGORIES = [
  'All',
  'Foundations',
  'Geometry',
  'Computation',
  'Philosophy',
  'Practice',
]

export const KB_ENTRIES: KBEntry[] = [
  {
    id: 'flower-of-life',
    title: 'Flower of Life',
    category: 'Geometry',
    tags: ['sacred geometry', 'pattern', 'lattice'],
    updated: '2026-07-20',
    content: `# Flower of Life

The **Flower of Life** is one of the oldest geometric symbols on record, appearing in the Temple of Osiris at Abydos, Egypt, estimated at over 6,000 years old. It consists of multiple evenly-spaced, overlapping circles arranged with sixfold symmetry.

## Structure

The construction begins with a single circle. Six identical circles are placed so that each passes through the center of the original, their own centers landing on the circumference of the first. This generates six points of intersection — the vertices of a regular hexagon.

\`\`\`
Step 1: Draw seed circle
Step 2: Place 6 circles through center, centers on circumference
Step 3: Continue outward — each new circle center at an existing intersection
\`\`\`

The result is a hexagonal lattice of interlocking circles, each pair of adjacent circles intersecting at exactly two points.

## Mathematical Properties

| Property | Value |
|----------|-------|
| Symmetry group | p6m (wallpaper group) |
| Node degree (interior) | 6 |
| Interior angle | 120° |
| Ratio (inscribed hex / circle) | √3 / 2 |

The lattice is **vertex-transitive** — every node is equivalent under the symmetry group. This makes it an optimal substrate for several distributed computation topologies.

## Derived Forms

- **Fruit of Life** — 13 circles selected from the Flower; the basis for Metatron's Cube
- **Seed of Life** — the 7-circle inner kernel
- **Tree of Life** — the Kabbalistic diagram can be extracted from the Flower's proportions

## Applications in Computation

The hexagonal lattice minimizes perimeter per unit area (Honeycomb Conjecture, proved by Thomas Hales in 1999). This property underlies its appearance in:

- Efficient hash table designs
- Hexagonal grid pathfinding (used in strategy games and robotics)
- Graphene's atomic structure — the source of its extraordinary strength-to-weight ratio

> The Flower of Life is not decoration. It is a compressed proof that hexagonal symmetry is optimal — a theorem encoded in stone millennia before formal mathematics existed.

## References

- Melchizedek, Drunvalo — *The Ancient Secret of the Flower of Life*
- Hales, Thomas — *The Honeycomb Conjecture*, Discrete & Computational Geometry (2001)
- Conway, John & Sloane, Neil — *Sphere Packings, Lattices and Groups*
`,
  },
  {
    id: 'golden-ratio',
    title: 'The Golden Ratio (φ)',
    category: 'Foundations',
    tags: ['mathematics', 'proportion', 'fibonacci'],
    updated: '2026-07-14',
    content: `# The Golden Ratio (φ)

The **golden ratio**, denoted φ (phi), is the unique positive real number satisfying:

\`\`\`
φ = (1 + √5) / 2 ≈ 1.6180339887...
\`\`\`

It arises from the simplest possible self-referential proportion: a line segment divided such that the ratio of the whole to the longer part equals the ratio of the longer part to the shorter.

## Algebraic Identity

φ has the remarkable property that its reciprocal equals itself minus one:

\`\`\`
1/φ = φ - 1
φ² = φ + 1
\`\`\`

This self-similarity at every scale is why φ appears in fractals, recursive structures, and biological growth patterns.

## Relationship to Fibonacci

The ratio of consecutive Fibonacci numbers converges to φ:

| n | F(n) | F(n)/F(n-1) |
|---|------|-------------|
| 5 | 5 | 1.6667 |
| 8 | 21 | 1.6250 |
| 13 | 233 | 1.6180 |
| 21 | 10946 | 1.61803... |

This convergence explains why φ appears in phyllotaxis — the spiral arrangement of leaves, seeds, and petals — since plant growth that follows Fibonacci counts naturally produces the most efficient packing.

## In Sacred Geometry

The golden ratio is embedded in:

- The **pentagon** and **pentagram** — every diagonal of a regular pentagon divides in golden ratio
- The **Pythagorean triangle** (3-4-5 rescaled)
- The proportions of the **Parthenon** and many Gothic cathedrals
- The **Great Pyramid** of Giza (height to base ratio)

## In Computation

φ appears in algorithm analysis in surprising places:

- **Fibonacci heaps** achieve amortized O(log n) decrease-key by exploiting the golden ratio's self-similar structure
- The **golden section search** algorithm finds extrema with the minimum number of function evaluations
- **Quasicrystals** — discovered by Dan Shechtman in 1982 — exhibit fivefold symmetry with φ-ratio spacing, a pattern previously thought impossible in crystalline matter

## As Archetype

Carl Jung's colleague Marie-Louise von Franz analyzed number archetypes extensively. She observed that φ represents **dynamic self-similarity** — growth that preserves its own proportions. This is why it appears wherever a system must grow while remaining true to its own structure.
`,
  },
  {
    id: 'attention-mechanism',
    title: 'Transformer Attention',
    category: 'Computation',
    tags: ['AI', 'architecture', 'attention', 'transformer'],
    updated: '2026-07-28',
    content: `# Transformer Attention

The **attention mechanism**, introduced in *Attention Is All You Need* (Vaswani et al., 2017), is the architectural core of modern large language models. It allows a model to weight the relevance of each element in a sequence relative to every other element.

## Scaled Dot-Product Attention

Given queries **Q**, keys **K**, and values **V**:

\`\`\`
Attention(Q, K, V) = softmax(QKᵀ / √dₖ) · V
\`\`\`

- **Q** (queries) — what we are looking for
- **K** (keys) — what each token offers
- **V** (values) — what each token contributes if selected
- **√dₖ** — scaling factor to prevent vanishing gradients in high dimensions

## Multi-Head Attention

Rather than computing a single attention function, transformers run *h* parallel attention heads, each with its own learned projections:

\`\`\`
MultiHead(Q,K,V) = Concat(head₁,...,headₕ) · Wᴼ
where headᵢ = Attention(Q·Wᵢᴼ, K·Wᵢᴷ, V·Wᵢᵛ)
\`\`\`

Each head can specialize — one might track syntactic dependency, another semantic similarity, another positional proximity.

## Contemplative Parallel

The attention matrix is a map of *relevance* — a weighting of what matters to what, across an entire field of tokens simultaneously. This is structurally similar to what contemplative traditions call **bare attention**: the capacity to be aware of an entire field of experience without privileging any single element, while allowing relevance to emerge naturally.

The softmax normalization ensures attention weights sum to 1 — the total "awareness" is conserved and distributed, not generated from nothing.

## Complexity

| Variant | Time | Space |
|---------|------|-------|
| Full attention | O(n²d) | O(n²) |
| Linear attention | O(nd²) | O(nd) |
| Flash Attention | O(n²d) | O(n) |

The quadratic scaling of full attention with sequence length is the central engineering challenge driving research into sparse, local, and linear attention variants.

## Key Properties

- **Permutation equivariant** — attention has no inherent position sense; positional encodings are added separately
- **Parallelizable** — unlike RNNs, attention over a full sequence can be computed in a single matrix operation
- **Interpretable** — attention weights can be visualized; heads develop interpretable specializations
`,
  },
  {
    id: 'pythagorean-number-theory',
    title: 'Pythagorean Number Theory',
    category: 'Philosophy',
    tags: ['Pythagoras', 'number', 'archetype', 'ancient'],
    updated: '2026-06-25',
    content: `# Pythagorean Number Theory

The Pythagoreans — the school founded by Pythagoras of Samos (~570–495 BCE) — held that **number is the principle of all things**. This was not a metaphor. They meant that the deep structure of reality is mathematical, and that different numbers carry distinct qualitative characters.

## The Monad (1)

Unity. The source from which all other numbers proceed. The Pythagoreans did not consider 1 a number in the modern sense — it was the *principle* of number, the generator of the series.

In computation: the unit type, the identity element, the base case of every recursion.

## The Dyad (2)

The first true number, and the principle of **difference**. The Dyad introduces the possibility of contrast — self and other, one and many, signal and noise.

In computation: the bit. All digital information is dyadic at root.

## The Triad (3)

**Synthesis**. The number that mediates between the Monad and the Dyad. Thesis, antithesis, synthesis. Beginning, middle, end. In music, the third creates harmony from the polarity of two tones.

In computation: the three-address instruction (two inputs, one output) is the atomic unit of most CPU architectures.

## The Tetrad (4)

**Form in space**. Four is the first number that generates solid geometry — the tetrahedron has 4 vertices and is the simplest 3D form. The Pythagoreans swore their oaths by the Tetraktys, the triangular arrangement of 10 dots in 4 rows.

\`\`\`
    •
   • •
  • • •
 • • • •
\`\`\`

The Tetraktys contains the ratios of musical harmony: 1:2 (octave), 2:3 (fifth), 3:4 (fourth).

## The Decad (10)

The return to unity at a higher level. 10 = 1 + 2 + 3 + 4 — the sum of the Tetraktys. The Pythagoreans considered 10 the most perfect number: it contains and completes all prior principles.

In computation: our base-10 numeral system. The tension between decimal (human) and binary (machine) notation is itself a Pythagorean problem.

## Contemporary Relevance

Marie-Louise von Franz's *Number and Time* (1974) extended the Pythagorean framework through Jungian psychology, arguing that numbers function as **archetypes** — patterns in the collective unconscious that structure both psyche and matter. The fact that mathematics describes physical reality at all — what Wigner called "the unreasonable effectiveness of mathematics" — remains unexplained. The Pythagorean hypothesis (number is primary) is still on the table.
`,
  },
  {
    id: 'meditation-and-attention-training',
    title: 'Meditation as Attention Training',
    category: 'Practice',
    tags: ['meditation', 'attention', 'practice', 'neuroscience'],
    updated: '2026-07-01',
    content: `# Meditation as Attention Training

Meditation, stripped of its cultural framing, is a systematic training of **attentional control** — the capacity to direct, sustain, and flexibly redirect awareness.

## Two Axes of Practice

Most contemplative traditions work along two orthogonal axes:

### 1. Focused Attention (FA) / Samatha

Training the capacity to sustain attention on a chosen object (breath, mantra, sensation) and return when distracted.

**Neural correlate**: strengthens the anterior cingulate cortex (ACC) — the executive attention network.

**Computational analogy**: gradient descent with a fixed learning rate. Repeated return to the objective, small corrections accumulating into stable convergence.

### 2. Open Monitoring (OM) / Vipassana

Training the capacity to observe the entire field of experience without preferential attention — noticing what arises, without being captured by it.

**Neural correlate**: reduces default mode network (DMN) activation — the "mind wandering" network.

**Computational analogy**: transformer attention over a full sequence. No single element is privileged; relevance is allowed to emerge from the field.

## A Basic Protocol

\`\`\`
Duration: 20 minutes
Posture:  Seated, spine upright, eyes closed or soft gaze

Phase 1 (0–10 min): Focused Attention
  — Anchor attention on the breath at the nostrils
  — When distracted, note the distraction without judgment
  — Return to the breath

Phase 2 (10–20 min): Open Monitoring
  — Release the breath as anchor
  — Allow awareness to rest in open receptivity
  — Notice sounds, sensations, thoughts as they arise and pass
  — Maintain witnessing stance — present but not reactive
\`\`\`

## Why This Matters for Technical Work

Deep technical work requires sustained, high-quality attention. Meditation practice demonstrably improves:

- **Sustained attention span** — reduced mind-wandering during complex tasks
- **Working memory capacity** — more information held online simultaneously
- **Error detection** — ACC activation correlates with catching mistakes
- **Emotional regulation** — less reactivity to frustrating bugs, unclear requirements, and ambiguous systems

The practice is not separate from the work. It is preparation for the quality of presence that good work requires.
`,
  },
  {
    id: 'openclaw-overview',
    title: 'About OpenClaw',
    category: 'Foundations',
    tags: ['meta', 'platform', 'overview'],
    updated: '2026-08-01',
    content: `# About OpenClaw

**OpenClaw** is a living platform for the intersection of spiritual inquiry and technological craft. It is organized around three convictions:

1. **Ancient pattern is compressed knowledge.** Sacred geometric forms, number systems, and cosmological diagrams encode structural truths that formal mathematics has largely rediscovered through different means. Studying them is research, not mysticism.

2. **Technology is not neutral.** Every tool encodes assumptions — about what is easy, what is hard, what is an error, what is valid. Building tools with intention means making those assumptions consciously, in the light of clarity rather than habit.

3. **Attention is the substrate of both.** The contemplative traditions cultivate attention as their primary instrument. So does careful engineering. These practices are not parallel — they are the same discipline applied in different domains.

## Structure

| Section | Purpose |
|---------|---------|
| **Blog** | Long-form essays, reflections, and research notes |
| **Tools** | Interactive instruments for geometry, computation, and planning |
| **Knowledge Base** | Reference entries — definitions, frameworks, annotated concepts |

## Naming

The name *OpenClaw* holds a tension: the claw is precise, gripping, directed — a tool of focused action. *Open* qualifies it: not grasping, but receptive. The open claw is both an instrument and an invitation.

It also nods to the open-source ethic: built in public, documented honestly, without pretension.

## Technology

OpenClaw is built with:

- **React 19** with **React Router** for navigation
- **Tailwind CSS v4** for styling
- **react-markdown** with **remark-gfm** for this Knowledge Base
- **Vite 8** as the build tool
- Hosted on the **Figma Make** infrastructure

All tools are built as self-contained React components. SVG diagrams are composed in code rather than exported from design tools, so they remain programmable.

## Contributing

OpenClaw is currently a solo project. If you are working at the intersection of contemplative practice and computational research, correspondence is welcome.
`,
  },
]
