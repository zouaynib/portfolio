/**
 * The robots in the lab — one per model, each standing on its own plinth.
 *
 * `robot` selects which body is built in RobotModels.jsx. `palette` drives its
 * colours, so a robot's look and its project stay described in one place.
 *
 * `image` points at a real result plot pulled from the matching GitHub repo.
 * They live in `public/models/`; re-download with a newer plot any time and the
 * panel picks it up.
 */

export const MODELS = [
  {
    id: 'flash',
    robot: 'flash',
    name: 'Flash',
    /** One line of character, shown under the robot's name. */
    character: 'Impatient. Measures everything. Cannot sit still.',
    title: 'FlashAttention-2 from scratch',
    meta: 'Triton · CUDA · PyTorch',
    description:
      'A from-scratch Triton implementation of FlashAttention-2, written to study the memory-bandwidth bottleneck behind long-context transformers. Tiled softmax computed online so the full attention matrix is never written to memory, with a correctness suite against PyTorch references and latency and peak-memory sweeps.',
    image: '/models/flashattention.png',
    imageCaption: 'Latency against sequence length, measured on an A100.',
    link: 'https://github.com/zouaynib/flashattention',
    palette: { body: '#f2f0ec', accent: '#ff8a3d', glow: '#ffb066', trim: '#2f333c' },
  },
  {
    id: 'sentinel',
    robot: 'sentinel',
    name: 'Sentinel',
    character: 'Listens to machines. Worries about them a little.',
    title: 'A foundation model for industrial health monitoring',
    meta: 'Self-supervised · Masked autoencoders · PHM',
    description:
      'Cross-domain self-supervised pre-training on raw sensor signals, so a single model covers bearings, gearboxes and turbofans instead of one model per machine. 99.2% on CWRU, roughly twice the baseline at 1% labels, and 82% zero-shot transfer to MFPT.',
    image: '/models/phm.png',
    imageCaption: 't-SNE of the pre-trained representations, coloured by fault type.',
    link: 'https://github.com/zouaynib/phm-foundation-model',
    palette: { body: '#5b7fb0', accent: '#f0c04a', glow: '#8fd0ff', trim: '#2c3a4d' },
  },
  {
    id: 'mochi',
    robot: 'mochi',
    name: 'Mochi',
    character: 'Only speaks in meows. Insists this is a research contribution.',
    title: 'MeowFM',
    meta: 'Audio SSL · Bioacoustics · Benchmark',
    description:
      'A self-supervised foundation model for domestic cat vocalizations, released with a cleaned corpus and an evaluation benchmark. It tests whether generic audio models underperform on affective and individual-level tasks, and whether domain-specific continued pretraining plus call-type-conditioned normalization closes the gap. Splits are identity-aware, so the same cat never appears in both train and test.',
    image: null,
    imageCaption: null,
    link: 'https://github.com/zouaynib/MeowFM',
    palette: { body: '#3f3d4a', accent: '#f2a3b3', glow: '#a8e6a0', trim: '#26242e' },
  },
  {
    id: 'swarm',
    robot: 'swarm',
    name: 'The Trio',
    character: 'Three of them. No leader. Somehow it works.',
    title: 'Self-organization of robots in a hostile environment',
    meta: 'Multi-agent systems · Mesa · Solara',
    description:
      'A decentralized multi-agent simulation for autonomous radioactive waste cleanup. Three robot types work across three contamination zones with no central coordinator — coordination is emergent, driven only by what each agent can perceive locally.',
    image: '/models/swarm.gif',
    imageCaption: 'The simulation running, with A* path optimisation.',
    link: 'https://github.com/zouaynib/Self-Organization-of-Robots-in-a-Hostile-Environnement',
    palette: { body: '#e8b33a', accent: '#2b2b30', glow: '#9dff7a', trim: '#3a3226' },
  },
  {
    id: 'ledger',
    robot: 'ledger',
    name: 'Ledger',
    character: 'Knows who is about to leave. Is very tactful about it.',
    title: 'Telecom churn prediction platform',
    meta: 'Ensembles · Calibration · Full-stack',
    description:
      'An end-to-end churn platform combining diversity-driven ensemble learning with probability calibration, so the predicted probabilities can actually be acted on rather than just ranked.',
    image: '/models/churn.png',
    imageCaption: 'Calibration curves across the candidate models.',
    link: 'https://github.com/zouaynib/Churn-Prediction-',
    palette: { body: '#eceff1', accent: '#3fa6a0', glow: '#5fe0d8', trim: '#31424a' },
  },
  {
    id: 'tick',
    robot: 'tick',
    name: 'Tick',
    character: 'Watches the price. Has opinions. Rarely acts on them.',
    title: 'Trading with reinforcement learning',
    meta: 'Q-learning · DQN · Market microstructure',
    description:
      'A BTC-USD trading agent comparing tabular Q-learning against DQN with experience replay, reward shaping and policy analysis — alongside separate work predicting mid-price movements from limit order book data.',
    image: '/models/trading.png',
    imageCaption: 'Evaluation of the trained DQN agent.',
    link: 'https://github.com/zouaynib/Trading-with-Reinforcement-Learning',
    palette: { body: '#2e3a52', accent: '#4ade80', glow: '#4ade80', trim: '#1b2334' },
  },
]
