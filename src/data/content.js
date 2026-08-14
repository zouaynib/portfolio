/**
 * All portfolio copy lives here.
 *
 * Nothing in the 3D scene reads anything except this file, so you can edit
 * freely without touching the shaders. Hotspot `position` is world XZ — the
 * marker snaps to the terrain. `view` is where the camera settles when the
 * section opens; `azimuth` is radians, set so the camera sits outward from the
 * world origin.
 *
 * Project blurbs below were written from the READMEs on github.com/zouaynib.
 * Check the wording still matches what you want to claim before you ship.
 */

export const PROFILE = {
  name: 'Zaynab Raounak',
  tagline: 'machine learning · signals · foundation models',
  intro: 'MSc AI student at CentraleSupélec.',
}

export const GITHUB = 'https://github.com/zouaynib'

export const SECTIONS = [
  {
    id: 'about',
    label: 'About',
    position: [6.3, -35.5],
    view: { distance: 17, height: 5.6, azimuth: 2.967 },
    heading: 'About me',
    body: [
      "I'm an MSc AI student at CentraleSupélec, after an engineering degree at École Centrale Casablanca.",
      'My interests span machine learning and deep learning, from model architectures and representation learning to optimization. Outside of my studies, I read about science, paint, and I am pretty much always thinking about plants and animals. 🌱',
    ],
    items: [],
  },
  {
    id: 'projects',
    label: 'Projects',
    position: [-15.2, -32.6],
    view: { distance: 17, height: 5.6, azimuth: 3.578 },
    heading: 'Projects',
    body: [
      'Mostly self-supervised learning, signals, and things I wanted to understand from the inside.',
    ],
    items: [
      {
        title: 'FlashAttention-2 from scratch',
        meta: 'Triton · CUDA · PyTorch',
        text: 'A from-scratch Triton implementation of FlashAttention-2, written to study the memory-bandwidth bottleneck behind long-context transformers. Correctness suite against PyTorch references, plus latency and peak-memory sweeps.',
        link: 'https://github.com/zouaynib/flashattention',
      },
      {
        title: 'A foundation model for industrial health monitoring',
        meta: 'Self-supervised · Masked autoencoders · PHM',
        text: 'Cross-domain self-supervised pre-training on raw sensor signals, so one model covers bearings, gearboxes and turbofans. 99.2% on CWRU, roughly 2x the baseline at 1% labels, and 82% zero-shot transfer to MFPT.',
        link: 'https://github.com/zouaynib/phm-foundation-model',
      },
      {
        title: 'MeowFM',
        meta: 'Audio SSL · Bioacoustics · Benchmark',
        text: 'A self-supervised foundation model for domestic cat vocalizations, with a cleaned corpus and an evaluation benchmark. Tests whether domain-specific pretraining plus call-type-conditioned normalization closes the gap on affective and individual-level tasks.',
        link: 'https://github.com/zouaynib/MeowFM',
      },
      {
        title: 'Self-organization of robots in a hostile environment',
        meta: 'Multi-agent systems · Mesa · Solara',
        text: 'A decentralized multi-agent simulation for autonomous radioactive waste cleanup: three robot types, three contamination zones, no central coordinator.',
        link: 'https://github.com/zouaynib/Self-Organization-of-Robots-in-a-Hostile-Environnement',
      },
      {
        title: 'Telecom churn prediction platform',
        meta: 'Ensembles · Calibration · Full-stack',
        text: 'End-to-end churn platform combining diversity-driven ensemble learning with probability calibration.',
        link: 'https://github.com/zouaynib/Churn-Prediction-',
      },
      {
        title: 'Trading with reinforcement learning',
        meta: 'Q-learning · DQN · Market microstructure',
        text: 'A BTC-USD trading agent comparing tabular Q-learning against DQN with experience replay, reward shaping and policy analysis — alongside separate work predicting mid-price moves from limit order book data.',
        link: 'https://github.com/zouaynib/Trading-with-Reinforcement-Learning',
      },
    ],
  },
  {
    id: 'skills',
    label: 'Skills',
    position: [-31.2, -18.0],
    view: { distance: 17, height: 5.6, azimuth: 4.189 },
    heading: 'Skills',
    body: [],
    items: [
      {
        title: 'Languages',
        meta: '',
        text: 'English, French, Arabic, Python ;)',
        link: '',
      },
      {
        title: 'ML & deep learning',
        meta: '',
        text: 'PyTorch, Triton, self-supervised learning, masked autoencoders, transformers, reinforcement learning, NLP fine-tuning.',
        link: '',
      },
      {
        title: 'Data & systems',
        meta: '',
        text: 'Kafka, multi-agent simulation (Mesa), graph ML.',
        link: '',
      },
    ],
  },
  {
    id: 'education',
    label: 'Education',
    position: [-35.9, 3.1],
    view: { distance: 17, height: 5.6, azimuth: 4.8 },
    heading: 'Education',
    body: [],
    items: [
      {
        title: 'MSc in Artificial Intelligence',
        meta: 'CentraleSupélec · 2025-2026',
        text: 'Foundations of Machine Learning, Deep Learning, Artificial Intelligence, Inferential Optimization, Natural Language Processing, Computer Vision, Scalable algorithms, Reinforcement Learning...',
        link: '',
      },
      {
        title: 'Engineering degree',
        meta: 'École Centrale Casablanca · 2023-2027',
        text: 'Data and ML',
        link: '',
      },
    ],
  },
  {
    id: 'contact',
    label: 'Contact',
    position: [-27.6, 23.1],
    view: { distance: 17, height: 5.6, azimuth: 5.411 },
    heading: 'Get in touch',
    body: ['Always happy to talk about machine learning, math..or painting.'],
    items: [
      {
        title: 'Email',
        meta: '',
        text: 'zaynabraounak@gmail.com',
        link: 'mailto:zaynabraounak@gmail.com',
      },
      { title: 'GitHub', meta: '', text: 'github.com/zouaynib', link: GITHUB },
      {
        title: 'Instagram',
        meta: 'artwork',
        text: '@zouaynibart',
        link: 'https://www.instagram.com/zouaynibart/',
      },
      {
        title: 'LinkedIn',
        meta: '',
        text: 'linkedin.com/in/zaynab-raounak',
        link: 'https://www.linkedin.com/in/zaynab-raounak-2728a0208',
      },
    ],
  },
]

/** The studio sits apart from the stones — you walk to it and step inside. */
export const HOUSE = {
  position: [-6, -50],
  /** Yaw in radians. The door faces back toward the middle of the meadow. */
  rotation: 0.12,
}

/**
 * The lab: a small modern pavilion beside the studio, housing the model robots.
 *
 * Placed so both buildings fall inside the opening camera view and read as one
 * small compound at the far end of the meadow, and angled — like the studio —
 * to face back toward the middle of it.
 */
export const LAB = {
  position: [-24, -52],
  rotation: 0.432,
}
