import type {
  Phase,
  Topic,
  SkillTier,
  LearningPath,
  ResourceGroup,
} from "./types";

/**
 * Toàn bộ nội dung "Ultimate AI Engineer Roadmap 2026" chuyển sang dữ liệu có kiểu.
 * Nguồn: AI_ENGINEER_ROADMAP.md
 */

export const phases: Phase[] = [
  {
    number: 0,
    slug: "phase-0-mindset",
    title: "Mindset & Orientation",
    icon: "Compass",
    goal: "Hiểu rõ vai trò AI Engineer 2026 và thị trường đang cần gì.",
    summary: "Định vị bản thân giữa AI Engineer vs ML Engineer.",
    accent: "violet",
    topics: [
      {
        id: "what-is-ai-engineer",
        code: "0.1",
        title: "What is an AI Engineer (2026)?",
        items: [
          "Không phải data scientist hay ML researcher — bạn là cầu nối giữa model và sản phẩm",
          "Integrate, orchestrate, deploy AI models vào production",
          "Thiết kế multi-LLM pipelines: routing, fallback, cost optimization",
          "Build RAG systems, AI agents, agentic workflows",
          "Biết khi nào dùng OpenAI vs Claude vs Gemini vs open-source",
        ],
      },
      {
        id: "ai-vs-ml-engineer",
        code: "0.2",
        title: "AI Engineer vs ML Engineer",
        items: [
          "AI Engineer: dùng pretrained models qua API, nhanh ra mắt",
          "ML Engineer: train model từ đầu, tốn kém, nặng nghiên cứu",
          "AI Engineer cần product + dev expertise, không cần math quá sâu",
        ],
      },
      {
        id: "market-demand",
        code: "0.3",
        title: "Market Demand 2026",
        items: [
          "Multi-LLM orchestration (OpenAI + Claude + Gemini routing)",
          "RAG architecture & vector databases",
          "AI Agents & agentic systems",
          "LLMOps & production monitoring",
          "Prompt engineering at scale",
          "Fine-tuning & PEFT methods",
          "MCP (Model Context Protocol)",
          "Multimodal AI systems",
          "Cost optimization & inference efficiency",
        ],
      },
    ],
    projects: [],
  },
  {
    number: 1,
    slug: "phase-1-programming",
    title: "Programming Foundation",
    icon: "Code",
    goal: "Viết Python sạch, chất lượng production — không thương lượng.",
    summary: "Python, NumPy, Pandas, async cho AI APIs.",
    accent: "cyan",
    topics: [
      {
        id: "python-fundamentals",
        code: "1.1",
        title: "Python Fundamentals",
        description:
          "Kiểu dữ liệu, mutable vs immutable, string, collections và control flow — nền tảng không thể thiếu, với các cạm bẫy thật hay gặp trong AI pipeline.",
        items: [
          "Data types: int, float, str, bool, None + type conversion",
          "type() và isinstance()",
          "Mutable vs immutable — quan trọng cho AI pipelines",
          "String slicing s[start:stop:step] và methods: split, join, strip",
          "f-strings: f\"value is {x:.2f}\"",
          "Collections: lists, tuples, dicts, sets, nested collections",
          "Control flow: if/elif/else, for, while, range, enumerate, zip",
        ],
      },
      {
        id: "functions",
        code: "1.2",
        title: "Functions",
        description:
          "Định nghĩa hàm, *args/**kwargs mà mọi AI SDK dùng, type hint và docstring để code production.",
        items: [
          "def, positional vs keyword arguments, default values",
          "*args và **kwargs — dùng liên tục trong AI SDKs",
          "Return values, tuple unpacking, lambda, recursion",
          "Docstrings",
        ],
      },
      {
        id: "oop",
        code: "1.3",
        title: "Object-Oriented Programming",
        description:
          "Class, kế thừa, super(), magic method và abstract class (ABC) — pattern mà LangChain/PyTorch xây toàn bộ kiến trúc.",
        items: [
          "Classes, __init__, instance methods, self",
          "Class vs instance variables, inheritance, super()",
          "Magic methods: __repr__, __str__, __len__, __getitem__",
          "@property, @staticmethod, @classmethod",
          "Abstract classes (ABC) — dùng nhiều trong LangChain, LlamaIndex",
        ],
      },
      {
        id: "pythonic-idioms",
        code: "1.4",
        title: "Pythonic Code & Idioms",
        description:
          "Comprehension, generator tiết kiệm memory, unpacking, collections — idiom giúp code AI ngắn gọn và hiệu quả.",
        items: [
          "List, dict, set comprehensions",
          "Generator expressions — tiết kiệm memory",
          "map(), filter(), reduce()",
          "Unpacking: a, b, *rest = lst",
          "any(), all(), sorted() với key=",
          "collections: Counter, defaultdict, deque",
        ],
      },
      {
        id: "file-io",
        code: "1.5",
        title: "File I/O & Data Handling",
        description:
          "Đọc/ghi text, CSV, JSON, pickle và quản lý đường dẫn bằng pathlib — kỹ năng thiết yếu khi nạp dataset và lưu model.",
        items: [
          "open() với context managers",
          "CSV với csv module, JSON với json.load/dump",
          "Pickle: dump/load",
          "os module, pathlib.Path (modern), glob",
        ],
      },
      {
        id: "error-handling",
        code: "1.6",
        title: "Error Handling & Debugging",
        description:
          "try/except, custom exception, logging có level, pdb/breakpoint và cách đọc traceback — để code AI chịu lỗi và dễ debug.",
        items: [
          "try/except/finally, catch specific exceptions",
          "raise ValueError(\"msg\"), custom exception classes",
          "logging module: DEBUG, INFO, WARNING, ERROR",
          "pdb và breakpoint(), đọc tracebacks",
        ],
      },
      {
        id: "performance-memory",
        code: "1.7",
        title: "Performance & Memory",
        description:
          "Generator/yield, itertools, profiling (cProfile), shallow vs deep copy và tại sao vectorization thắng Python loop.",
        items: [
          "Generators và yield — critical cho streaming AI responses",
          "itertools module",
          "timeit và cProfile để benchmark",
          "Shallow vs deep copy",
          "Ưu tiên vectorization hơn Python loops",
        ],
      },
      {
        id: "numpy",
        code: "1.8",
        title: "NumPy (Non-Negotiable for AI)",
        description:
          "ndarray, broadcasting, boolean indexing, matmul (@ vs *) và linear algebra — thư viện lõi mà mọi AI framework xây trên đó.",
        items: [
          "Array creation: np.array, zeros, ones, eye",
          "shape, ndim, dtype, reshape, flatten, ravel",
          "Stacking: stack, hstack, vstack",
          "Boolean indexing, np.where, broadcasting rules",
          "np.dot và @ operator",
          "Matrix ops: linalg.inv, linalg.eig",
          "Aggregations với axis=, np.random",
        ],
      },
      {
        id: "pandas",
        code: "1.9",
        title: "Pandas (Essential for Data Work)",
        description:
          "DataFrame, loc/iloc, lọc, xử lý missing, groupby/aggregate, merge — công cụ chính để khám phá và làm sạch dataset AI.",
        items: [
          "DataFrames & Series creation",
          "head, info, describe, shape",
          "loc vs iloc, boolean filtering",
          "Handling missing: isna, dropna, fillna",
          "groupby, agg, pivot_table, value_counts",
          "merge, concat, melt, pivot",
          "pd.to_datetime",
        ],
      },
      {
        id: "code-quality",
        code: "1.10",
        title: "Code Quality & Project Structure",
        description:
          "venv, requirements.txt, type hint, dataclasses, pytest và Ruff — giữ code AI sạch, có kiểu, có test và tái lập được.",
        items: [
          "Virtual environments: venv hoặc conda",
          "requirements.txt và pip freeze",
          "Modular code, __init__.py",
          "Type hints: def fn(x: int) -> str",
          "dataclasses, unit tests với pytest",
          "Linting ruff/flake8, formatting black",
        ],
      },
      {
        id: "python-ai-workflows",
        code: "1.11",
        title: "Python for AI Workflows",
        description:
          "Jupyter/Colab, tqdm, argparse, dotenv quản lý API key, seeding tái lập và lưu/nạp model — công cụ hàng ngày của người làm AI.",
        items: [
          "Jupyter notebooks, Google Colab (GPU)",
          "tqdm progress bars, argparse CLI",
          "hydra/yaml configs, dotenv quản lý API keys",
          "Seeding cho reproducibility",
          "Saving/loading models: pickle, joblib, torch.save",
        ],
      },
      {
        id: "async-python",
        code: "1.12",
        title: "Async Python (Critical for AI APIs)",
        description:
          "async/await, asyncio.gather gọi song song nhiều LLM, Semaphore giới hạn rate, và streaming response — phần nhiều roadmap bỏ qua nhưng sống còn cho AI.",
        items: [
          "async/await syntax, asyncio event loop",
          "aiohttp — async HTTP calls",
          "Concurrent API calls với asyncio.gather()",
          "httpx — async-first HTTP client dùng trong production",
          "Tại sao streaming LLM responses cần async",
        ],
      },
    ],
    projects: [
      {
        id: "p1-easy",
        title: "Python AI Toolkit CLI",
        difficulty: "easy",
        phase: 1,
        description: "CLI tool nhận text input và gọi OpenAI API.",
        features: ["Summarize", "Translate", "Sentiment analysis"],
        stack: ["Python", "argparse", "openai SDK", ".env"],
      },
      {
        id: "p1-medium",
        title: "Async Multi-API Caller",
        difficulty: "medium",
        phase: 1,
        description: "Gọi OpenAI + Anthropic + Gemini đồng thời và so sánh.",
        features: [
          "asyncio.gather() gọi song song",
          "Error handling, retries với exponential backoff",
          "Hiển thị side-by-side trong terminal",
        ],
        stack: ["httpx", "asyncio", "rich"],
      },
      {
        id: "p1-hard",
        title: "Production-Grade Data Pipeline",
        difficulty: "hard",
        phase: 1,
        description: "Pipeline đọc CSV, làm sạch, chia batch, gửi embedding API.",
        features: [
          "Progress bars, error recovery",
          "Resume from checkpoint",
          "Async batching",
        ],
        stack: ["Pandas", "NumPy", "tqdm", "asyncio", "OpenAI Embeddings"],
      },
    ],
  },
  {
    number: 2,
    slug: "phase-2-math",
    title: "Mathematics & Statistics for AI",
    icon: "Sigma",
    goal: "Hiểu toán đằng sau model — không cần chứng minh hết, nhưng phải hiểu.",
    summary: "Linear algebra, calculus, probability, optimization.",
    accent: "sky",
    topics: [
      {
        id: "linear-algebra",
        code: "2.1",
        title: "Linear Algebra",
        description:
          "Vector, dot product, cosine similarity (cách embedding hoạt động), matmul, eigenvalues và SVD — ngôn ngữ của toàn bộ AI.",
        items: [
          "Vector — hình học và đại số, dot product, norm L1/L2/Lp",
          "Cosine similarity — cách embedding hoạt động",
          "Matrix ops: addition, multiplication, transpose, inverse",
          "Determinant, rank",
          "Eigenvalues/eigenvectors — tại sao quan trọng trong PCA",
          "SVD — high-level intuition & dimensionality reduction",
        ],
      },
      {
        id: "calculus",
        code: "2.2",
        title: "Calculus",
        description:
          "Đạo hàm, gradient, partial derivative và chain rule — cơ chế mà backpropagation lan truyền gradient ngược qua mạng.",
        items: [
          "Derivative — rate of change, power/chain/product rule",
          "Đạo hàm log, exp, sigmoid; minima, maxima, saddle points",
          "Partial derivative, gradient, Jacobian, Hessian",
          "Chain rule — cách backpropagation hoạt động",
          "Đạo hàm sigmoid, ReLU, softmax, cross-entropy, MSE",
        ],
      },
      {
        id: "probability-stats",
        code: "2.3",
        title: "Probability & Statistics",
        description:
          "Bayes, phân phối, MLE/MAP và entropy — toán của sự không chắc chắn mà model AI về bản chất đang học.",
        items: [
          "Joint, marginal, conditional probability, independence",
          "Bayes' Theorem: P(A|B) = P(B|A)P(A)/P(B)",
          "Random variables: PMF, PDF, CDF, expected value, variance",
          "Distributions: Bernoulli, Binomial, Gaussian, Uniform, Poisson",
          "Central Limit Theorem, MLE, MAP",
          "Entropy, KL Divergence, Cross-entropy",
        ],
      },
      {
        id: "optimization",
        code: "2.4",
        title: "Optimization",
        description:
          "Gradient descent, mini-batch, Adam, learning rate schedule và regularization — cách model thực sự cập nhật weight để học.",
        items: [
          "Objective/loss function, convex vs non-convex",
          "Gradient Descent: θ = θ - α∇L(θ)",
          "Batch GD vs SGD vs Mini-batch",
          "Optimizers: Momentum, RMSProp, Adam",
          "Learning rate schedules: step decay, cosine annealing, warmup",
          "Vanishing/exploding gradients, gradient clipping",
          "Regularization: L2, L1, dropout, early stopping",
        ],
      },
      {
        id: "information-theory",
        code: "2.5",
        title: "Information Theory",
        description:
          "Entropy, cross-entropy (loss tự nhiên cho classification), KL divergence (dùng trong RLHF, VAE, distillation) — gộp lại vì sao loss hoạt động.",
        items: [
          "Entropy H(X) = -Σ p(x) log p(x)",
          "Cross-entropy loss — loss tự nhiên cho classification",
          "KL Divergence — dùng trong VAEs, distillation, RL",
          "Mutual information, bits vs nats",
        ],
      },
    ],
    projects: [
      {
        id: "p2-easy",
        title: "Cosine Similarity Search",
        difficulty: "easy",
        phase: 2,
        description: "Implement cosine similarity từ scratch bằng NumPy.",
        features: ["Mini semantic search", "Visualize vector space"],
        stack: ["Python", "NumPy", "matplotlib"],
      },
      {
        id: "p2-medium",
        title: "Gradient Descent Visualizer",
        difficulty: "medium",
        phase: 2,
        description: "Gradient descent from scratch cho linear & logistic regression.",
        features: ["Visualize loss curves, decision boundaries", "So sánh SGD vs Adam vs RMSProp"],
        stack: ["Python", "NumPy", "matplotlib"],
      },
      {
        id: "p2-hard",
        title: "Build Your Own Neural Network from Scratch",
        difficulty: "hard",
        phase: 2,
        description: "Forward pass, backprop, weight updates thuần NumPy.",
        features: [
          "Linear, ReLU, Sigmoid, Softmax layers",
          "Train trên MNIST, >95% accuracy",
          "Không dùng PyTorch/TensorFlow",
        ],
        stack: ["Python", "NumPy", "matplotlib"],
      },
    ],
  },
  {
    number: 3,
    slug: "phase-3-ml-fundamentals",
    title: "Machine Learning Fundamentals",
    icon: "Cpu",
    goal: "Hiểu các thuật toán ML cổ điển cho feature engineering & evaluation.",
    summary: "Supervised/unsupervised, scikit-learn, tuning.",
    accent: "emerald",
    topics: [
      {
        id: "core-ml-concepts",
        code: "3.1",
        title: "Core ML Concepts",
        description:
          "Supervised/unsupervised/RL, train-validation-test split, overfitting, bias-variance, cross-validation và metrics — nền tảng để đánh giá model đúng.",
        items: [
          "Supervised vs Unsupervised vs Reinforcement Learning",
          "Train/validation/test split, overfitting & underfitting",
          "Bias-variance tradeoff, k-fold cross-validation",
          "Metrics: Accuracy, Precision, Recall, F1, AUC-ROC",
        ],
      },
      {
        id: "linear-logistic",
        code: "3.2",
        title: "Linear & Logistic Regression",
        description:
          "Linear regression, logistic regression, MSE/BCE, regularization và multiclass — baseline supervised quan trọng cho mọi AI Engineer.",
        items: [
          "Linear regression — closed form & gradient descent",
          "Logistic regression — sigmoid, binary classification",
          "Cost functions: MSE, Binary Cross-Entropy",
          "Regularization: Ridge (L2), Lasso (L1), One-vs-Rest",
        ],
      },
      {
        id: "trees-ensembles",
        code: "3.3",
        title: "Decision Trees & Ensembles",
        description:
          "Decision trees, Gini/entropy, random forest, gradient boosting (XGBoost/LightGBM) và feature importance cho dữ liệu tabular.",
        items: [
          "Decision trees — Gini, entropy",
          "Random forests — bagging",
          "Gradient boosting — XGBoost, LightGBM",
          "Feature importance",
        ],
      },
      {
        id: "unsupervised",
        code: "3.4",
        title: "Unsupervised Learning",
        description:
          "K-Means, DBSCAN, PCA, t-SNE/UMAP và embedding visualization — học cấu trúc khi không có nhãn.",
        items: [
          "K-Means clustering, DBSCAN",
          "PCA — dimensionality reduction",
          "t-SNE / UMAP — visualize high-dimensional data (embeddings)",
        ],
      },
      {
        id: "hyperparameter-tuning",
        code: "3.5",
        title: "Hyperparameter Tuning",
        description:
          "Grid search, random search, Bayesian optimization, early stopping và strategy tuning để chọn model configuration có hệ thống.",
        items: [
          "Grid search, random search, Bayesian optimization",
          "Learning rate, batch size, epochs, layers",
          "Early stopping",
        ],
      },
      {
        id: "scikit-learn",
        code: "3.6",
        title: "ML with Scikit-Learn",
        description:
          "Pipeline, preprocessing, ColumnTransformer, GridSearchCV, joblib và API fit/transform/predict — toolkit chuẩn cho ML classic.",
        items: [
          "Pipeline(), StandardScaler, MinMaxScaler, OneHotEncoder",
          "GridSearchCV, cross_val_score",
          "joblib save models, fit/transform/predict API",
        ],
      },
    ],
    projects: [
      {
        id: "p3-easy",
        title: "Spam Classifier",
        difficulty: "easy",
        phase: 3,
        description: "Spam/not-spam classifier với TF-IDF + Logistic Regression.",
        features: ["Đánh giá precision, recall, F1"],
        stack: ["scikit-learn", "Pandas", "NLTK"],
      },
      {
        id: "p3-medium",
        title: "Customer Churn Prediction System",
        difficulty: "medium",
        phase: 3,
        description: "Pipeline đầy đủ: cleaning → feature engineering → train → eval.",
        features: ["Logistic Regression vs Random Forest vs XGBoost", "SHAP explainability"],
        stack: ["scikit-learn", "XGBoost", "SHAP", "Pandas", "matplotlib"],
      },
      {
        id: "p3-hard",
        title: "AutoML Mini-Framework",
        difficulty: "hard",
        phase: 3,
        description: "Framework tự thử nhiều model & hyperparameters.",
        features: ["Evaluation report đầy đủ", "Feature importance, confusion matrix, ROC curve"],
        stack: ["scikit-learn", "Optuna", "Pandas", "matplotlib"],
      },
    ],
  },
  {
    number: 4,
    slug: "phase-4-deep-learning",
    title: "Deep Learning",
    icon: "Network",
    goal: "Hiểu neural networks đủ sâu để làm việc với transformers.",
    summary: "Neural nets, CNN, RNN, attention, PyTorch.",
    accent: "emerald",
    topics: [
      {
        id: "nn-fundamentals",
        code: "4.1",
        title: "Neural Network Fundamentals",
        description:
          "Neuron, perceptron, MLP, activation, forward pass, backpropagation và initialization — nền móng để hiểu deep learning.",
        items: [
          "Neuron, Perceptron, MLP",
          "Activation: Sigmoid, Tanh, ReLU, GELU, SwiGLU",
          "Forward pass, backpropagation",
          "Weight initialization, vanishing/exploding gradients",
        ],
      },
      {
        id: "training-techniques",
        code: "4.2",
        title: "Training Techniques",
        description:
          "BatchNorm, LayerNorm, dropout, residual connections và gradient clipping — kỹ thuật giúp train mạng sâu ổn định.",
        items: [
          "Batch normalization, layer normalization (transformers)",
          "Dropout, residual connections (skip connections)",
          "Gradient clipping",
        ],
      },
      {
        id: "cnn",
        code: "4.3",
        title: "Convolutional Neural Networks (CNN)",
        description:
          "Convolution, pooling, CNN architectures (LeNet/AlexNet/VGG/ResNet), transfer learning và ứng dụng vision.",
        items: [
          "Convolution operation, pooling layers",
          "Architectures: LeNet, AlexNet, VGG, ResNet",
          "Transfer learning với CNNs",
        ],
      },
      {
        id: "rnn",
        code: "4.4",
        title: "Recurrent Neural Networks (RNN)",
        description:
          "RNN, hidden state, LSTM/GRU, bidirectional RNN, Seq2Seq và beam search — kiến trúc sequence trước transformer.",
        items: [
          "RNN, hidden state, vanishing gradient trong RNNs",
          "LSTM — forget/input/output gates, GRU",
          "Bidirectional RNNs, Seq2Seq encoder+decoder",
          "Beam search decoding",
        ],
      },
      {
        id: "attention",
        code: "4.5",
        title: "Attention Mechanism (Pre-Transformer)",
        description:
          "Attention trước transformer: additive/multiplicative, Bahdanau, soft retrieval và cách nó giải quyết bottleneck Seq2Seq.",
        items: [
          "Attention as \"soft\" alignment",
          "Additive vs multiplicative attention",
          "Bahdanau attention cho seq2seq",
        ],
      },
      {
        id: "pytorch",
        code: "4.6",
        title: "PyTorch (Master This)",
        description:
          "Tensor, autograd, nn.Module, Dataset/DataLoader, training loop, GPU, save/load và scheduler — framework thực tế để train model.",
        items: [
          "Tensors, torch.nn.Module, torch.optim",
          "Custom Dataset, DataLoader",
          "Training loop: forward → loss → backward → step",
          "model.eval() vs model.train(), save/load",
          ".to(device), requires_grad, torch.no_grad()",
          "Custom loss functions, LR schedulers",
        ],
      },
      {
        id: "transfer-learning",
        code: "4.7",
        title: "Transfer Learning",
        description:
          "Pretraining, feature extraction vs fine-tuning, freezing strategy và HuggingFace pretrained models — tận dụng model đã học sẵn.",
        items: [
          "Pretraining và tại sao quan trọng",
          "Fine-tuning vs feature extraction, freezing layers",
          "ImageNet moment cho NLP, HuggingFace pretrained models",
        ],
      },
    ],
    projects: [
      {
        id: "p4-easy",
        title: "Image Classifier with Transfer Learning",
        difficulty: "easy",
        phase: 4,
        description: "Fine-tune ResNet-18 trên custom dataset (5 categories).",
        features: ["Track train/val accuracy", "Plot loss curves"],
        stack: ["PyTorch", "torchvision", "matplotlib"],
      },
      {
        id: "p4-medium",
        title: "Sentiment Analysis with LSTM vs BERT",
        difficulty: "medium",
        phase: 4,
        description: "LSTM from scratch rồi so sánh với pretrained BERT.",
        features: ["So sánh performance trên movie reviews"],
        stack: ["PyTorch", "HuggingFace Transformers"],
      },
      {
        id: "p4-hard",
        title: "Build a Mini GPT from Scratch",
        difficulty: "hard",
        phase: 4,
        description: "Toàn bộ transformer: attention, multi-head, positional encoding, FFN.",
        features: ["Residual connections", "Train trên Shakespeare/wiki"],
        stack: ["PyTorch", "NumPy", "(nanoGPT style)"],
      },
    ],
  },
  {
    number: 5,
    slug: "phase-5-nlp-transformers",
    title: "NLP & Transformers",
    icon: "Languages",
    goal: "NLP chuyên sâu cho sản phẩm chạy bằng LLM.",
    summary: "Tokenization, embeddings, transformer architecture.",
    accent: "cyan",
    topics: [
      {
        id: "text-preprocessing",
        code: "5.1",
        title: "Text Preprocessing",
        description:
          "Tokenization, normalization, stopwords, stemming/lemmatization, sentence segmentation, special tokens và Unicode trong text thật.",
        items: [
          "Tokenization: words, subwords, characters",
          "Lowercasing, punctuation, whitespace",
          "Stopword removal, stemming vs lemmatization",
          "Special tokens: URLs, emails, hashtags, Unicode/utf-8",
        ],
      },
      {
        id: "classical-representation",
        code: "5.2",
        title: "Classical Text Representation",
        description:
          "Bag of Words, TF-IDF, n-grams, one-hot và sparse vs dense representation — nền tảng của search và baseline NLP.",
        items: [
          "Bag of Words (BoW)",
          "TF-IDF — formula & intuition",
          "N-grams, one-hot encoding",
          "Sparse vs dense representations",
        ],
      },
      {
        id: "word-embeddings",
        code: "5.3",
        title: "Word Embeddings",
        description:
          "Word2Vec, GloVe, FastText, cosine similarity, analogies và static vs contextual embeddings — semantic vector cho NLP/RAG.",
        items: [
          "Word2Vec (CBOW vs Skip-gram), GloVe, FastText",
          "Cosine similarity, analogy tasks: king - man + woman = queen",
          "Static vs contextual embeddings",
        ],
      },
      {
        id: "subword-tokenization",
        code: "5.4",
        title: "Subword Tokenization (Modern)",
        description:
          "BPE, WordPiece, SentencePiece, special tokens, token IDs và vocab-size tradeoffs — cách LLM biến text thành số.",
        items: [
          "BPE (GPT), WordPiece (BERT), SentencePiece (T5, LLaMA)",
          "Special tokens: [CLS], [SEP], [PAD], [MASK], <eos>, <bos>",
          "Token IDs, vocabulary size tradeoffs",
        ],
      },
      {
        id: "transformer-architecture",
        code: "5.5",
        title: "Transformer Architecture (Master This)",
        description:
          "Self-attention, Q/K/V, multi-head attention, positional encoding, encoder/decoder và causal masking — trái tim của LLM.",
        items: [
          "Self-attention: Query, Key, Value",
          "Attention score: softmax(QKᵀ/√d_k)V",
          "Multi-head attention, positional encoding",
          "Feed-forward sublayer, layer norm, residual connections",
          "Encoder-only (BERT), Decoder-only (GPT), Encoder-Decoder (T5)",
          "Causal masking trong decoders",
        ],
      },
      {
        id: "language-modeling",
        code: "5.6",
        title: "Language Modeling",
        description:
          "Next-token prediction, masked language modeling, perplexity, temperature/top-k/top-p và decoding strategies.",
        items: [
          "P(next token | previous tokens), autoregressive & MLM",
          "Perplexity — đánh giá language models",
          "Temperature, Top-k, Top-p (nucleus) sampling",
          "Greedy vs sampling vs beam search",
        ],
      },
      {
        id: "key-models",
        code: "5.7",
        title: "Key Pretrained Models",
        description:
          "BERT, GPT, Claude, Gemini, T5, LLaMA, Mistral, Qwen — phân loại model families và chọn model đúng task.",
        items: [
          "BERT — classification, NER, QA",
          "GPT-4 / Claude / Gemini — generation, chat, multimodal",
          "T5 — seq2seq, LLaMA 3 — open-source fine-tuning",
          "Mistral 7B — efficient, Qwen 2.5 — multilingual",
        ],
      },
      {
        id: "nlp-metrics",
        code: "5.8",
        title: "NLP Evaluation Metrics",
        description:
          "BLEU, ROUGE, BERTScore, perplexity, exact match, human evaluation và LLM-as-judge — đánh giá NLP đúng cách.",
        items: [
          "BLEU (translation), ROUGE (summarization)",
          "Perplexity, BERTScore (semantic similarity)",
          "Exact Match (EM) cho QA, human evaluation",
        ],
      },
      {
        id: "nlp-libraries",
        code: "5.9",
        title: "Key Python Libraries",
        description:
          "NLTK, spaCy, HuggingFace Transformers/Datasets, sentence-transformers, tiktoken và evaluate — toolkit NLP cần biết.",
        items: [
          "NLTK, spaCy (NER, parsing)",
          "transformers & datasets (HuggingFace)",
          "sentence-transformers, tiktoken, evaluate",
        ],
      },
    ],
    projects: [
      {
        id: "p5-easy",
        title: "Named Entity Recognition (NER) Pipeline",
        difficulty: "easy",
        phase: 5,
        description: "Dùng spaCy extract entities từ news articles.",
        features: ["Web interface với Streamlit"],
        stack: ["spaCy", "Streamlit"],
      },
      {
        id: "p5-medium",
        title: "Semantic Search Engine",
        difficulty: "medium",
        phase: 5,
        description: "Embed 10,000 Wikipedia paragraphs bằng BERT.",
        features: ["Search tìm passages semantic tương tự"],
        stack: ["HuggingFace", "sentence-transformers", "FAISS", "Streamlit"],
      },
      {
        id: "p5-hard",
        title: "Fine-tune BERT for Multi-Label Classification",
        difficulty: "hard",
        phase: 5,
        description: "Fine-tune BERT trên multi-label dataset.",
        features: ["Handle class imbalance, custom metrics", "Deploy REST API với FastAPI"],
        stack: ["PyTorch", "HuggingFace Transformers", "FastAPI", "Docker"],
      },
    ],
  },
  {
    number: 6,
    slug: "phase-6-llm-engineering",
    title: "Large Language Models & AI Engineering",
    icon: "Sparkles",
    goal: "Domain cốt lõi — master LLM fundamentals, APIs và production patterns.",
    summary: "LLM architecture, prompt engineering, multi-provider APIs.",
    accent: "violet",
    topics: [
      {
        id: "llm-fundamentals",
        code: "6.1",
        title: "LLM Fundamentals",
        items: [
          "Transformer at scale, context window & KV Cache",
          "Positional encodings: Absolute, Relative, RoPE, ALiBi",
          "Flash Attention, Grouped Query Attention (GQA)",
          "Sliding window attention (Mistral)",
          "Pretraining → Instruction tuning → RLHF → DPO",
          "Scaling laws: model size, data, compute",
        ],
      },
      {
        id: "prompt-engineering",
        code: "6.2",
        title: "Prompt Engineering (Production-Grade)",
        items: [
          "Prompt anatomy: system, user, assistant, few-shot",
          "Zero/one/few-shot, Chain-of-Thought (CoT)",
          "Self-consistency, ReAct, Tree of Thought (ToT)",
          "Structured output (JSON/XML), role prompting, prompt chaining",
          "Prompt versioning, A/B testing, prompt compression",
          "Prompt injection defense",
        ],
      },
      {
        id: "ai-apis",
        code: "6.3",
        title: "Working with AI APIs",
        items: [
          "OpenAI: Chat Completions, function calling, JSON mode, streaming (SSE)",
          "Embeddings API, Vision API, Assistants API, Batch API, tiktoken",
          "Anthropic (Claude): Messages API, 200K context, vision, tool use",
          "Google Gemini: multimodal, real-time search grounding, context caching",
          "Mistral, LLaMA via HuggingFace/Ollama",
          "Cohere, NVIDIA NIM, Groq (LPU), Together AI, Replicate",
        ],
      },
      {
        id: "api-patterns",
        code: "6.4",
        title: "API Integration Patterns",
        items: [
          "Token limits, truncation, context window management",
          "Streaming SSE, partial responses",
          "Rate limiting & retries: exponential backoff + jitter",
          "Cost control: log usage, model routing, caching (SHA-256)",
          "Error handling & fallback chain",
        ],
      },
      {
        id: "secure-api",
        code: "6.5",
        title: "Secure API Integration",
        items: [
          "Không bao giờ expose API keys ra frontend",
          ".env local, Secret Manager production",
          "Backend proxy pattern, per-user rate limiting (Redis)",
          "API key rotation, logging & monitoring",
        ],
      },
    ],
    projects: [
      {
        id: "p6-easy",
        title: "Multi-Provider AI Chatbot",
        difficulty: "easy",
        phase: 6,
        description: "Chatbot switch giữa OpenAI / Claude / Gemini.",
        features: ["Streaming SSE", "Conversation history trong Redis"],
        stack: ["FastAPI", "OpenAI SDK", "Anthropic SDK", "Redis", "React"],
      },
      {
        id: "p6-medium",
        title: "AI-Powered Resume Ranker",
        difficulty: "medium",
        phase: 6,
        description: "Upload PDF resume → extract text → so với job description.",
        features: ["Match score, missing skills, feedback", "Caching Redis (SHA-256)"],
        stack: ["FastAPI", "OpenAI", "pdf-parse", "Redis", "React"],
      },
      {
        id: "p6-hard",
        title: "Production AI Middleware Service",
        difficulty: "hard",
        phase: 6,
        description: "Middleware giữa app và nhiều LLM providers.",
        features: [
          "Intelligent routing, rate limiting, cost tracking",
          "Fallback chain, prompt logging, token counting, async batching",
        ],
        stack: ["FastAPI", "Redis", "PostgreSQL", "OpenAI+Anthropic+Gemini", "Docker"],
      },
    ],
  },
  {
    number: 7,
    slug: "phase-7-multi-llm-orchestration",
    title: "Multi-LLM Orchestration (Specialty)",
    icon: "Workflow",
    goal: "Thiết kế và build hệ thống multi-LLM production-grade.",
    summary: "Routing, fallback, MCP, LangChain, LangGraph, CrewAI.",
    accent: "fuchsia",
    topics: [
      {
        id: "why-multi-llm",
        code: "7.1",
        title: "Why Multi-LLM Architecture",
        items: [
          "Không model nào tốt cho mọi task",
          "Cost optimization, reliability (fallback)",
          "Latency routing, compliance, context window routing",
        ],
      },
      {
        id: "routing-strategies",
        code: "7.2",
        title: "Routing Strategies",
        items: [
          "Task-based: simple→Mistral/GPT-3.5, reasoning→GPT-4/Claude Opus",
          "Code→GPT-4/CodeLlama, multimodal→Gemini/GPT-4V",
          "Cost-based: user tier, token budget, dynamic spend routing",
          "Performance-based: track quality per model, A/B testing",
        ],
      },
      {
        id: "fallback-architecture",
        code: "7.3",
        title: "Fallback Architecture",
        items: [
          "Cascade: GPT-4o → Claude 3.5 → GPT-3.5 → Cache → Default",
          "Circuit Breaker: track failure rate, open/half-open/close",
        ],
      },
      {
        id: "mcp",
        code: "7.4",
        title: "Model Context Protocol (MCP)",
        items: [
          "Anthropic's open standard cho AI-tool connectivity",
          "MCP Servers (resources, tools, prompts) & Clients",
          "Build MCP server bằng Python & TypeScript",
          "Connect DB, APIs, file systems, multi-agent systems",
        ],
      },
      {
        id: "orchestration-frameworks",
        code: "7.5",
        title: "LLM Orchestration Frameworks",
        items: [
          "LangChain: Chains, Agents, Memory, Tools, LCEL, LangSmith",
          "LangGraph: stateful, cyclical workflows, nodes, edges, state",
          "LlamaIndex: data connectors, index types, query engines",
          "CrewAI: multi-agent task decomposition, roles, goals",
          "AutoGen (Microsoft): AssistantAgent, UserProxy, group chat",
        ],
      },
      {
        id: "multi-llm-gateway",
        code: "7.6",
        title: "Multi-LLM Gateway Architecture",
        items: [
          "Provider abstraction layer — unified interface",
          "Intelligent router, token counter, cost tracker",
          "Response validator, fallback manager, cache manager (semantic)",
          "Observability: traces, metrics, logs",
        ],
      },
    ],
    projects: [
      {
        id: "p7-easy",
        title: "LLM Router Dashboard",
        difficulty: "easy",
        phase: 7,
        description: "UI so sánh responses từ GPT-4, Claude, Gemini side-by-side.",
        features: ["Token count, cost, latency cho mỗi model"],
        stack: ["React", "FastAPI", "OpenAI+Anthropic+Gemini"],
      },
      {
        id: "p7-medium",
        title: "Intelligent Multi-LLM Router",
        difficulty: "medium",
        phase: 7,
        description: "Classify queries và route đến model tối ưu.",
        features: ["Fallback chain, cost tracking, response caching"],
        stack: ["FastAPI", "Redis", "PostgreSQL", "OpenAI+Anthropic+Gemini"],
      },
      {
        id: "p7-hard",
        title: "Production Multi-LLM Orchestration Platform",
        difficulty: "hard",
        phase: 7,
        description: "Gateway đầy đủ: auth, rate limiting, routing, observability.",
        features: [
          "Cost tracking per user/feature, prompt versioning, A/B testing",
          "MCP integration, streaming, K8s auto-scaling",
        ],
        stack: ["FastAPI", "Redis", "PostgreSQL", "Kafka", "Docker", "K8s", "Grafana"],
      },
    ],
  },
  {
    number: 8,
    slug: "phase-8-rag-vector-db",
    title: "RAG & Vector Databases",
    icon: "Database",
    goal: "Build retrieval systems cho phép LLM truy cập kiến thức private.",
    summary: "Embeddings, chunking, vector DBs, advanced retrieval.",
    accent: "cyan",
    topics: [
      {
        id: "why-rag",
        code: "8.1",
        title: "Why RAG Exists",
        items: [
          "LLM có knowledge cutoff, không truy cập private data",
          "RAG = Embedding search + Prompt generation",
          "RAG vs Fine-tuning — khi nào dùng cái nào",
        ],
      },
      {
        id: "embeddings",
        code: "8.2",
        title: "Embeddings Deep Dive",
        items: [
          "Dense semantic vector representations",
          "OpenAI: text-embedding-3-small/large",
          "Open source: all-MiniLM-L6-v2, bge-large",
          "Cohere embed-english-v3 — tuned cho RAG",
          "Batch embedding, dimensions tradeoff, similarity metrics",
        ],
      },
      {
        id: "chunking",
        code: "8.3",
        title: "Chunking Strategies",
        items: [
          "Fixed-size, sentence-based, recursive character (LangChain default)",
          "Semantic chunking, document-based (headers/sections)",
          "Chunk size vs overlap, metadata (source, page, section)",
        ],
      },
      {
        id: "vector-databases",
        code: "8.4",
        title: "Vector Databases",
        items: [
          "FAISS (local), Chroma, Pinecone (managed), Weaviate, Qdrant",
          "LanceDB (embedded), pgvector (Postgres), MongoDB Atlas, Supabase",
          "Indexing, similarity search, filtered search",
          "Hybrid search (BM25 + embeddings), HNSW index",
        ],
      },
      {
        id: "rag-pipeline",
        code: "8.5",
        title: "RAG Pipeline Implementation",
        items: [
          "Basic: Document → Chunk → Embed → Store; Query → Embed → Retrieve → LLM",
          "HyDE — generate hypothetical answer để retrieve",
          "Query expansion, reranking (cross-encoder), multi-query",
          "Self-querying, contextual compression, parent document retriever",
          "Evaluation: faithfulness, answer relevance, context precision/recall (RAGAs)",
        ],
      },
      {
        id: "production-rag",
        code: "8.6",
        title: "Production RAG Considerations",
        items: [
          "Incremental indexing, document versioning",
          "Multi-tenant isolation, caching, monitoring",
          "Fallback \"I don't know\" khi context thiếu",
        ],
      },
    ],
    projects: [
      {
        id: "p8-easy",
        title: "Chat with Your PDF",
        difficulty: "easy",
        phase: 8,
        description: "Upload PDF, chunk + embed, hỏi câu hỏi.",
        features: ["Q&A trên nội dung PDF"],
        stack: ["LangChain", "OpenAI", "Chroma", "Streamlit"],
      },
      {
        id: "p8-medium",
        title: "Multi-Document Knowledge Base",
        difficulty: "medium",
        phase: 8,
        description: "Ingest PDF, DOCX, TXT, web pages.",
        features: ["Hybrid search BM25 + vector", "Source attribution"],
        stack: ["LlamaIndex", "Qdrant", "Cohere Rerank", "FastAPI", "React"],
      },
      {
        id: "p8-hard",
        title: "Enterprise RAG System",
        difficulty: "hard",
        phase: 8,
        description: "Multi-tenant RAG với namespace isolation.",
        features: [
          "Incremental ingestion pipeline",
          "HyDE + reranking + contextual compression",
          "RAG evaluation dashboard (RAGAs), monitoring",
        ],
        stack: ["LangChain", "Pinecone", "Cohere", "FastAPI", "Redis", "Grafana", "Docker"],
      },
    ],
  },
  {
    number: 9,
    slug: "phase-9-ai-agents",
    title: "AI Agents & Agentic Systems",
    icon: "Bot",
    goal: "Build autonomous AI systems có thể reason, plan và hành động.",
    summary: "ReAct, tool use, memory, multi-agent systems.",
    accent: "violet",
    topics: [
      {
        id: "what-are-agents",
        code: "9.1",
        title: "What Are AI Agents",
        items: [
          "Agent = LLM + Tools + Memory + Planning",
          "Agent vs chain — agent quyết định động",
          "Types: ReAct, Plan-and-Execute, Multi-agent",
          "Risks: cost, hallucination, infinite loops",
        ],
      },
      {
        id: "agent-components",
        code: "9.2",
        title: "Agent Components",
        items: [
          "Tools: web search (Tavily), code interpreter, calculator, DB query",
          "File I/O, API calls, web scraping, calendar/email (MCP)",
          "Memory: in-context, external (vector), entity, summary, episodic",
          "Planning: ReAct, Plan-and-execute, Tree of Thoughts, MRKL",
        ],
      },
      {
        id: "function-calling",
        code: "9.3",
        title: "Function Calling / Tool Use",
        items: [
          "OpenAI tool use: JSON schemas, parse, execute, continue",
          "Parallel tool calls",
          "Anthropic tool use format & multi-tool",
          "Tool validation, error handling, timeouts, authorization",
          "Sandboxed code execution",
        ],
      },
      {
        id: "multi-agent",
        code: "9.4",
        title: "Multi-Agent Systems",
        items: [
          "Patterns: supervisor→worker, peer-to-peer, pipeline, adversarial",
          "LangGraph: stateful graphs, conditional edges, parallel exec",
          "Human-in-the-loop checkpoints",
          "Use cases: code review, research, dev (Devin), support",
        ],
      },
      {
        id: "agentic-ai",
        code: "9.5",
        title: "Agentic AI (Production)",
        items: [
          "Autonomy, goal-directedness, persistence, adaptability",
          "Task decomposition, progress tracking, error recovery",
          "Human escalation, audit trails",
          "Safety: action confirmation, scope limitation, cost controls",
        ],
      },
    ],
    projects: [
      {
        id: "p9-easy",
        title: "ReAct Agent with Web Search",
        difficulty: "easy",
        phase: 9,
        description: "Agent search web trả lời current events.",
        features: ["Tools: Tavily search, calculator, current date"],
        stack: ["LangChain", "OpenAI", "Tavily API"],
      },
      {
        id: "p9-medium",
        title: "Code Review Agent",
        difficulty: "medium",
        phase: 9,
        description: "Multi-agent: Reviewer + Improver + Tester.",
        features: ["Supports Python & JavaScript", "Sandboxed execution"],
        stack: ["LangGraph", "OpenAI", "Docker"],
      },
      {
        id: "p9-hard",
        title: "Autonomous Research Agent",
        difficulty: "hard",
        phase: 9,
        description: "Agent decompose, research, synthesize report.",
        features: [
          "Search web + KB, read papers",
          "Parallel research, source citation, confidence scoring",
        ],
        stack: ["LangGraph", "OpenAI+Claude", "Tavily", "Pinecone", "FastAPI", "React", "Redis"],
      },
    ],
  },
  {
    number: 10,
    slug: "phase-10-fine-tuning",
    title: "Fine-Tuning & Model Customization",
    icon: "SlidersHorizontal",
    goal: "Customize models cho domain và use case cụ thể.",
    summary: "LoRA, QLoRA, DPO, RLHF, PEFT.",
    accent: "amber",
    topics: [
      {
        id: "when-to-finetune",
        code: "10.1",
        title: "When to Fine-Tune",
        items: [
          "Fine-tune khi: cần output format nhất quán, domain knowledge, giảm prompt length",
          "Không fine-tune khi: RAG rẻ hơn, ít data (<50-100), cần knowledge mới",
        ],
      },
      {
        id: "full-finetuning",
        code: "10.2",
        title: "Full Fine-Tuning",
        items: [
          "Pipeline + instruction format {prompt, completion}",
          "OpenAI fine-tuning API (GPT-3.5, GPT-4o-mini)",
          "HuggingFace Trainer API",
          "Hyperparameters: LR, epochs, batch size",
        ],
      },
      {
        id: "peft",
        code: "10.3",
        title: "Parameter-Efficient Fine-Tuning (PEFT)",
        items: [
          "LoRA — inject trainable matrices, rank r, alpha scaling",
          "QLoRA — 4-bit quant + LoRA, fine-tune 70B trên consumer GPU",
          "Prefix tuning, prompt tuning, IA3",
        ],
      },
      {
        id: "ft-tools",
        code: "10.4",
        title: "Fine-Tuning Tools",
        items: [
          "HuggingFace PEFT, TRL (SFT, RLHF, DPO)",
          "Unsloth (2x faster), Axolotl, LLaMA-Factory",
          "Weights & Biases, MLflow",
        ],
      },
      {
        id: "dataset",
        code: "10.5",
        title: "Dataset Preparation",
        items: [
          "Alpaca format (instruction), ShareGPT (chat), DPO (chosen vs rejected)",
          "Cleaning, deduplication, augmentation, quality filtering, mixing",
        ],
      },
      {
        id: "evaluation",
        code: "10.6",
        title: "Evaluation After Fine-Tuning",
        items: [
          "Task metrics: BLEU, ROUGE, F1, accuracy",
          "Benchmarks: MMLU, HumanEval, MT-Bench",
          "LLM-as-judge, regression testing",
        ],
      },
    ],
    projects: [
      {
        id: "p10-easy",
        title: "Fine-tune GPT-3.5 on Custom Q&A",
        difficulty: "easy",
        phase: 10,
        description: "100 Q&A pairs trong domain của bạn.",
        features: ["So sánh base vs fine-tuned"],
        stack: ["OpenAI Fine-tuning API", "Python"],
      },
      {
        id: "p10-medium",
        title: "LoRA Fine-tune LLaMA on Code",
        difficulty: "medium",
        phase: 10,
        description: "Fine-tune LLaMA 3 8B với LoRA cho code gen.",
        features: ["Đánh giá trên HumanEval"],
        stack: ["HuggingFace PEFT", "TRL", "Unsloth", "W&B"],
      },
      {
        id: "p10-hard",
        title: "Full RLHF Pipeline",
        difficulty: "hard",
        phase: 10,
        description: "Preference data → reward model → DPO.",
        features: ["Đánh giá custom benchmark"],
        stack: ["TRL", "HuggingFace", "PyTorch", "Axolotl", "W&B"],
      },
    ],
  },
  {
    number: 11,
    slug: "phase-11-generative-ai",
    title: "Generative AI (Beyond Text)",
    icon: "Image",
    goal: "Mở rộng ra image, audio, video, multimodal.",
    summary: "Diffusion, VAEs, GANs, multimodal, voice, video.",
    accent: "rose",
    topics: [
      {
        id: "vaes",
        code: "11.1",
        title: "Variational Autoencoders (VAEs)",
        items: [
          "Encoder → latent space → decoder",
          "KL divergence + reconstruction loss, reparameterization trick",
        ],
      },
      {
        id: "gans",
        code: "11.2",
        title: "Generative Adversarial Networks (GANs)",
        items: [
          "Generator vs Discriminator, minimax game",
          "Mode collapse, conditional GANs, StyleGAN, DCGAN",
        ],
      },
      {
        id: "diffusion",
        code: "11.3",
        title: "Diffusion Models",
        items: [
          "Forward process (add noise) & reverse (denoise)",
          "DDPM, score matching, DDIM",
          "Classifier-free guidance, Stable Diffusion, ControlNet",
        ],
      },
      {
        id: "text-to-image",
        code: "11.4",
        title: "Text-to-Image APIs",
        items: [
          "DALL-E 3, Stable Diffusion (Replicate/HF)",
          "Midjourney (UI), Ideogram, Flux",
          "Prompt engineering cho image, negative prompts",
        ],
      },
      {
        id: "multimodal",
        code: "11.5",
        title: "Multimodal AI",
        items: [
          "Vision-Language Models: GPT-4V/4o, Claude 3 Vision, Gemini",
          "LLaVA (open-source), CLIP",
          "Image captioning, visual QA, document understanding",
        ],
      },
      {
        id: "audio-ai",
        code: "11.6",
        title: "Audio AI",
        items: [
          "Whisper (STT), TTS: OpenAI, ElevenLabs, Coqui",
          "Music: Suno, Udio; voice cloning",
        ],
      },
      {
        id: "video-ai",
        code: "11.7",
        title: "Video AI",
        items: [
          "Sora (OpenAI), Runway ML, Pika Labs",
          "Gemini video understanding, frame-by-frame analysis",
        ],
      },
    ],
    projects: [
      {
        id: "p11-easy",
        title: "Image + Text Multi-Modal QA",
        difficulty: "easy",
        phase: 11,
        description: "Upload image, hỏi câu hỏi về nó.",
        features: ["GPT-4V hoặc Claude Vision"],
        stack: ["FastAPI", "OpenAI Vision API", "React"],
      },
      {
        id: "p11-medium",
        title: "AI Image Generation Pipeline",
        difficulty: "medium",
        phase: 11,
        description: "Text-to-image app với style controls.",
        features: ["Image-to-image transform", "Safety filtering"],
        stack: ["DALL-E 3", "Stable Diffusion (Replicate)", "FastAPI", "React"],
      },
      {
        id: "p11-hard",
        title: "Voice AI Assistant (Full Pipeline)",
        difficulty: "hard",
        phase: 11,
        description: "Voice → Whisper STT → LLM → TTS output.",
        features: ["Streaming audio", "Wake word, multi-language"],
        stack: ["Whisper", "GPT-4", "ElevenLabs TTS", "FastAPI", "React Native"],
      },
    ],
  },
  {
    number: 12,
    slug: "phase-12-mlops-llmops",
    title: "MLOps, LLMOps & Production Systems",
    icon: "Server",
    goal: "Ship AI ra production reliable, rẻ, scalable.",
    summary: "Docker, K8s, CI/CD, monitoring, security.",
    accent: "sky",
    topics: [
      {
        id: "data-management",
        code: "12.1",
        title: "Data Management & Versioning",
        items: [
          "DVC, Great Expectations, Pandera",
          "Feature stores: Feast, Tecton",
          "Pipelines: Airflow, Prefect, Luigi",
        ],
      },
      {
        id: "experiment-tracking",
        code: "12.2",
        title: "Experiment Tracking",
        items: [
          "Weights & Biases (industry standard), MLflow",
          "Track: hyperparameters, metrics, artifacts, code version",
        ],
      },
      {
        id: "training-infra",
        code: "12.3",
        title: "Training Infrastructure",
        items: [
          "GPU cloud: AWS SageMaker, GCP Vertex AI, Azure ML",
          "Distributed: PyTorch DDP, DeepSpeed, FSDP",
          "Mixed precision (FP16, BF16), checkpointing",
        ],
      },
      {
        id: "evaluation-testing",
        code: "12.4",
        title: "Model Evaluation & Testing",
        items: [
          "Offline: benchmarks, human eval, LLM-as-judge, red teaming",
          "Online: A/B testing, shadow deployment, canary releases",
        ],
      },
      {
        id: "deployment-serving",
        code: "12.5",
        title: "Model Deployment & Serving",
        items: [
          "FastAPI, Flask, gRPC, BentoML, Ray Serve",
          "Optimization: quantization, pruning, distillation, ONNX, TensorRT",
          "Backends: Ollama, vLLM (PagedAttention), TGI, LiteLLM, NVIDIA NIM",
        ],
      },
      {
        id: "containers-orchestration",
        code: "12.6",
        title: "Containerization & Orchestration",
        items: [
          "Docker, Dockerfile, multi-stage builds, Docker Compose",
          "Kubernetes, Helm charts, HPA auto-scaling, GPU scheduling",
        ],
      },
      {
        id: "cloud-deployment",
        code: "12.7",
        title: "Cloud Deployment",
        items: [
          "AWS: EC2, SageMaker, Lambda, ECS/EKS, S3, CloudWatch",
          "GCP: Vertex AI, Cloud Run, GKE, BigQuery",
          "Azure: Azure ML, Azure OpenAI Service, AKS",
        ],
      },
      {
        id: "monitoring",
        code: "12.8",
        title: "Monitoring & Logging",
        items: [
          "Token usage, latency (p50/p95/p99), error rates",
          "Hallucination detection, drift detection",
          "Tools: LangSmith, Helicone, Langfuse, Prometheus+Grafana, Datadog, Sentry",
        ],
      },
      {
        id: "cicd",
        code: "12.9",
        title: "CI/CD for AI",
        items: [
          "GitHub Actions / GitLab CI",
          "Model validation, prompt regression testing",
          "Feature flags, blue-green deployments",
        ],
      },
      {
        id: "llm-security",
        code: "12.10",
        title: "LLM Security & Safety",
        items: [
          "Prompt injection defense, content moderation (OpenAI Moderation API)",
          "PII detection & masking, data residency",
        ],
      },
    ],
    projects: [
      {
        id: "p12-easy",
        title: "Dockerize an AI API",
        difficulty: "easy",
        phase: 12,
        description: "Containerize FastAPI + OpenAI app.",
        features: ["Health checks, logging, env vars", "Deploy Railway/Render/AWS"],
        stack: ["Docker", "FastAPI", "GitHub Actions"],
      },
      {
        id: "p12-medium",
        title: "LLMOps Monitoring Dashboard",
        difficulty: "medium",
        phase: 12,
        description: "Instrument API với Langfuse/Helicone.",
        features: ["Track token, latency, error, cost", "Alert rules"],
        stack: ["FastAPI", "Langfuse/Helicone", "Grafana", "PostgreSQL"],
      },
      {
        id: "p12-hard",
        title: "Production AI Platform on Kubernetes",
        difficulty: "hard",
        phase: 12,
        description: "Multi-service: gateway, router, LLM proxy, monitoring.",
        features: ["K8s HPA auto-scaling", "CI/CD GitHub Actions", "Full observability"],
        stack: ["FastAPI", "Redis", "PostgreSQL", "Docker", "K8s", "Helm", "Prometheus", "Grafana"],
      },
    ],
  },
  {
    number: 13,
    slug: "phase-13-ai-system-design",
    title: "AI System Design",
    icon: "PenTool",
    goal: "Thiết kế AI systems ở quy mô lớn cho product và phỏng vấn.",
    summary: "Architecture patterns, caching, cost-aware, async.",
    accent: "amber",
    topics: [
      {
        id: "design-framework",
        code: "13.1",
        title: "AI System Design Framework",
        items: [
          "Clarify requirements → identify AI components → data flow",
          "Model selection → scalability → cost → reliability → monitoring",
        ],
      },
      {
        id: "classic-designs",
        code: "13.2",
        title: "Classic AI System Designs",
        items: [
          "AI Chatbot with Memory (Redis session)",
          "RAG Knowledge Base (chunk → embed → retrieve → rerank → LLM)",
          "Multi-LLM Recommendation System",
          "PDF Q&A at Scale (10K users)",
          "AI Customer Support (intent classifier → router)",
        ],
      },
      {
        id: "inference-placement",
        code: "13.3",
        title: "Inference Placement Strategy",
        items: [
          "Backend API (secure), client-side (low latency)",
          "Edge (Cloudflare Workers), async queue (handle spikes)",
        ],
      },
      {
        id: "caching",
        code: "13.4",
        title: "Caching Strategies",
        items: [
          "Exact match: SHA-256 hash → Redis",
          "Semantic caching: embed query → similar cached queries",
          "Prompt template caching",
        ],
      },
      {
        id: "async-architecture",
        code: "13.5",
        title: "Async AI Architecture",
        items: [
          "Async khi latency > 2-3s hoặc expensive",
          "Pattern: POST /task → Task ID → worker → poll/webhook",
        ],
      },
      {
        id: "cost-aware",
        code: "13.6",
        title: "Cost-Aware Architecture",
        items: [
          "Per-feature model selection (autocomplete GPT-3.5, QA GPT-4o)",
          "Cost reduction: compression, max_tokens, caching (50-70%)",
        ],
      },
    ],
    projects: [
      {
        id: "p13-easy",
        title: "Design Doc for AI Feature",
        difficulty: "easy",
        phase: 13,
        description: "5-page design doc cho AI feature.",
        features: ["Architecture, data flow, model, cost, fallback"],
        stack: ["Markdown", "diagrams"],
      },
      {
        id: "p13-medium",
        title: "Cost Calculator Tool",
        difficulty: "medium",
        phase: 13,
        description: "Tool estimate AI API costs.",
        features: ["OpenAI, Anthropic, Gemini, Cohere pricing", "Breakdown per model/feature/user"],
        stack: ["React", "FastAPI"],
      },
      {
        id: "p13-hard",
        title: "Full AI System Design Implementation",
        difficulty: "hard",
        phase: 13,
        description: "Implement architecture hoàn chỉnh cho 1 classic design.",
        features: ["Production-grade, scalable, monitored", "Write ADRs"],
        stack: ["Full production stack"],
      },
    ],
  },
  {
    number: 14,
    slug: "phase-14-sql-databases",
    title: "SQL & Databases for AI Engineers",
    icon: "DatabaseZap",
    goal: "Query data tự tin, thiết kế database hỗ trợ AI systems.",
    summary: "SQL core, window functions, pgvector, NoSQL.",
    accent: "emerald",
    topics: [
      {
        id: "core-sql",
        code: "14.1",
        title: "Core SQL",
        items: [
          "SELECT, FROM, WHERE, ORDER BY, LIMIT, DISTINCT",
          "AND, OR, NOT, IN, BETWEEN, LIKE, IS NULL",
          "JOINs: INNER, LEFT, RIGHT, FULL OUTER, SELF",
          "GROUP BY, HAVING, aggregates: COUNT, SUM, AVG, MIN, MAX",
        ],
      },
      {
        id: "advanced-sql",
        code: "14.2",
        title: "Advanced SQL",
        items: [
          "CTEs (WITH), window functions: ROW_NUMBER, RANK, LAG, LEAD",
          "PARTITION BY vs GROUP BY, SUM() OVER",
          "Recursive CTEs, subqueries, CASE WHEN, COALESCE",
        ],
      },
      {
        id: "ai-sql-patterns",
        code: "14.3",
        title: "AI-Specific SQL Patterns",
        items: [
          "Feature engineering queries, pivoting",
          "JSON columns, pgvector vector similarity search",
          "pgvector distance operators (<-> L2, <=> cosine), HNSW/IVFFlat indexes",
        ],
      },
      {
        id: "db-design",
        code: "14.4",
        title: "Database Design for AI Applications",
        items: [
          "Schema: conversation history, prompt versions, token usage",
          "User preferences/memory, indexing cho AI workloads",
        ],
      },
      {
        id: "nosql",
        code: "14.5",
        title: "NoSQL for AI",
        items: [
          "Redis (session, cache, rate limit, pub/sub streaming)",
          "MongoDB (document storage), DynamoDB (serverless)",
          "Khi nào SQL vs NoSQL",
        ],
      },
    ],
    projects: [
      {
        id: "p14-easy",
        title: "AI Usage Analytics Dashboard",
        difficulty: "easy",
        phase: 14,
        description: "DB tracking AI API usage + queries.",
        features: ["Cost per user, top features, error rates"],
        stack: ["PostgreSQL", "Python", "Metabase/Grafana"],
      },
      {
        id: "p14-medium",
        title: "pgvector Semantic Search",
        difficulty: "medium",
        phase: 14,
        description: "Semantic search với pgvector.",
        features: ["Store embeddings + metadata", "Efficient HNSW index"],
        stack: ["PostgreSQL+pgvector", "FastAPI", "OpenAI Embeddings"],
      },
      {
        id: "p14-hard",
        title: "Complete Database Architecture for AI Platform",
        difficulty: "hard",
        phase: 14,
        description: "Full schema multi-tenant AI platform.",
        features: ["Users, conversations, tokens, embeddings, A/B tests", "Migrations, indexes, partitioning"],
        stack: ["PostgreSQL", "pgvector", "Redis", "Alembic"],
      },
    ],
  },
  {
    number: 15,
    slug: "phase-15-quantization-optimization",
    title: "Quantization, Optimization & Efficiency",
    icon: "Gauge",
    goal: "Chạy model hiệu quả ở quy mô lớn.",
    summary: "Quantization, vLLM, SLMs, distillation.",
    accent: "rose",
    topics: [
      {
        id: "quantization",
        code: "15.1",
        title: "Model Quantization",
        items: [
          "FP32 → FP16 → BF16 → INT8 → INT4",
          "Post-Training Quantization (PTQ), Quantization-Aware Training (QAT)",
          "GPTQ, AWQ, GGUF (llama.cpp), bitsandbytes",
        ],
      },
      {
        id: "inference-optimization",
        code: "15.2",
        title: "Inference Optimization",
        items: [
          "KV Cache, continuous batching (vLLM)",
          "Speculative decoding, Flash Attention v2",
          "Tensor & pipeline parallelism",
        ],
      },
      {
        id: "slms",
        code: "15.3",
        title: "Small Language Models (SLMs)",
        items: [
          "Phi-3/4, Gemma 2 2B, Mistral 7B, Qwen 2.5 1.5B/3B, SmolLM",
          "Khi nào SLM beat LLM, on-device AI",
        ],
      },
      {
        id: "distillation",
        code: "15.4",
        title: "Knowledge Distillation",
        items: [
          "Teacher-student training, soft labels",
          "DistilBERT, TinyLlama",
        ],
      },
      {
        id: "serving-efficiency",
        code: "15.5",
        title: "Model Serving Efficiency",
        items: [
          "vLLM (PagedAttention, 24x throughput)",
          "TGI, Ollama, llama.cpp, ONNX Runtime, TensorRT-LLM",
        ],
      },
    ],
    projects: [
      {
        id: "p15-easy",
        title: "Local LLM Setup",
        difficulty: "easy",
        phase: 15,
        description: "Ollama với nhiều models.",
        features: ["Chat interface local", "Benchmark latency, memory"],
        stack: ["Ollama", "Python"],
      },
      {
        id: "p15-medium",
        title: "Model Quantization Comparison",
        difficulty: "medium",
        phase: 15,
        description: "LLaMA 3 8B quantize 8-bit & 4-bit.",
        features: ["Benchmark: perplexity, speed, memory, performance"],
        stack: ["bitsandbytes", "GPTQ", "HuggingFace"],
      },
      {
        id: "p15-hard",
        title: "High-Throughput Inference Server",
        difficulty: "hard",
        phase: 15,
        description: "Deploy vLLM với nhiều models.",
        features: ["Request batching, model switching, load balancing"],
        stack: ["vLLM", "Docker", "Kubernetes", "Prometheus", "Grafana"],
      },
    ],
  },
  {
    number: 16,
    slug: "phase-16-reinforcement-learning",
    title: "Reinforcement Learning for AI Engineers",
    icon: "Gamepad2",
    goal: "Hiểu RL đủ để làm việc với RLHF, PPO, agentic training.",
    summary: "MDPs, Q-learning, policy gradient, RLHF, DPO.",
    accent: "cyan",
    topics: [
      {
        id: "rl-fundamentals",
        code: "16.1",
        title: "RL Fundamentals",
        items: [
          "MDPs: Agent, Environment, State, Action, Reward",
          "Policy, value function, Q-function",
          "Exploration vs exploitation (ε-greedy, UCB), discount factor γ",
        ],
      },
      {
        id: "value-based",
        code: "16.2",
        title: "Value-Based Methods",
        items: [
          "Q-learning, DQN",
          "Double DQN, Dueling DQN, Prioritized Experience Replay",
        ],
      },
      {
        id: "policy-based",
        code: "16.3",
        title: "Policy-Based Methods",
        items: [
          "REINFORCE, Actor-Critic",
          "PPO (dùng trong RLHF), GRPO (DeepSeek R1)",
        ],
      },
      {
        id: "rl-for-llms",
        code: "16.4",
        title: "RL for LLMs (RLHF & Beyond)",
        items: [
          "RLHF pipeline: SFT → Reward Model → PPO",
          "DPO — simpler alternative, RLAIF, Constitutional AI",
          "Process Reward Models (PRMs) vs Outcome Reward Models (ORMs)",
        ],
      },
      {
        id: "multi-agent-rl",
        code: "16.5",
        title: "Multi-Agent RL",
        items: [
          "Cooperative vs competitive, game theory basics",
          "Self-play training, multi-agent communication",
        ],
      },
    ],
    projects: [
      {
        id: "p16-easy",
        title: "Train a CartPole Agent",
        difficulty: "easy",
        phase: 16,
        description: "Q-learning và PPO trên CartPole-v1.",
        features: ["So sánh convergence, stability"],
        stack: ["gymnasium", "stable-baselines3", "PyTorch"],
      },
      {
        id: "p16-medium",
        title: "Reward Model Training",
        difficulty: "medium",
        phase: 16,
        description: "Preference data → train reward model.",
        features: ["Bradley-Terry model"],
        stack: ["PyTorch", "HuggingFace Transformers", "TRL"],
      },
      {
        id: "p16-hard",
        title: "DPO Fine-tuning Pipeline",
        difficulty: "hard",
        phase: 16,
        description: "Preference dataset → DPO fine-tune 7B.",
        features: ["Evaluate vs SFT baseline"],
        stack: ["TRL", "HuggingFace PEFT", "Axolotl", "W&B"],
      },
    ],
  },
  {
    number: 17,
    slug: "phase-17-ethics-safety",
    title: "AI Ethics, Safety & Governance",
    icon: "ShieldCheck",
    goal: "Build AI có trách nhiệm — ngày càng là yêu cầu công việc.",
    summary: "Safety, bias, privacy, transparency, governance.",
    accent: "violet",
    topics: [
      {
        id: "safety-fundamentals",
        code: "17.1",
        title: "AI Safety Fundamentals",
        items: [
          "Types of harm: immediate, systemic, long-term",
          "Alignment problem, hallucination, bias, dual-use",
        ],
      },
      {
        id: "prompt-injection-security",
        code: "17.2",
        title: "Prompt Injection & Security",
        items: [
          "Direct vs indirect prompt injection",
          "Defense: role separation, input validation, output filtering",
          "Jailbreaking patterns, red teaming",
        ],
      },
      {
        id: "bias-fairness",
        code: "17.3",
        title: "Bias & Fairness",
        items: [
          "Sources: data, labeling, model design",
          "Fairness metrics: demographic parity, equalized odds",
          "Tools: Fairlearn, AI Fairness 360",
        ],
      },
      {
        id: "privacy-governance",
        code: "17.4",
        title: "Privacy & Data Governance",
        items: [
          "PII, GDPR compliance, data minimization",
          "Differential privacy, federated learning",
        ],
      },
      {
        id: "transparency",
        code: "17.5",
        title: "AI Transparency & Explainability",
        items: [
          "Model cards, system cards",
          "SHAP, LIME, attention visualization",
        ],
      },
      {
        id: "responsible-production",
        code: "17.6",
        title: "Responsible AI in Production",
        items: [
          "Content moderation architecture, safety classifiers",
          "Human-in-the-loop, audit trails, incident response",
          "Governance: EU AI Act, NIST AI RMF",
        ],
      },
    ],
    projects: [
      {
        id: "p17-easy",
        title: "Bias Audit Tool",
        difficulty: "easy",
        phase: 17,
        description: "Tool audit bias trong model outputs.",
        features: ["Demographic parity, equalized odds metrics"],
        stack: ["Fairlearn", "Python", "Streamlit"],
      },
      {
        id: "p17-medium",
        title: "Red Teaming Framework",
        difficulty: "medium",
        phase: 17,
        description: "Framework adversarial test LLM.",
        features: ["Jailbreak detection, prompt injection tests"],
        stack: ["Python", "OpenAI/Anthropic SDK"],
      },
      {
        id: "p17-hard",
        title: "Production Safety Pipeline",
        difficulty: "hard",
        phase: 17,
        description: "End-to-end safety pipeline cho AI app.",
        features: ["Input/output moderation", "PII masking", "Audit logging", "Incident response"],
        stack: ["FastAPI", "OpenAI Moderation", "Redis", "PostgreSQL"],
      },
    ],
  },
  {
    number: 18,
    slug: "capstone",
    title: "Capstone — Multi-LLM AI Platform",
    icon: "Trophy",
    goal: "Build hệ thống AI production hoàn chỉnh kết hợp mọi kỹ năng.",
    summary: "Gateway, router, RAG, agents, MCP, observability.",
    accent: "amber",
    isCapstone: true,
    topics: [
      {
        id: "system-overview",
        code: "C.1",
        title: "System Overview",
        items: [
          "Production-grade multi-tenant AI platform",
          "Nền tảng cho mọi AI product của bạn",
        ],
      },
      {
        id: "core-components",
        code: "C.2",
        title: "Core Components",
        items: [
          "API Gateway — auth, rate limiting, routing",
          "Multi-LLM Router — routing OpenAI/Claude/Gemini/Mistral",
          "RAG Engine — multi-document, multi-tenant",
          "Agent Orchestrator — multi-agent workflows",
          "MCP Integration — tool connectivity",
          "Observability — Langfuse, Prometheus, Grafana",
          "Admin Dashboard — analytics, cost tracking",
          "CI/CD Pipeline",
        ],
      },
      {
        id: "tech-stack",
        code: "C.3",
        title: "Technical Stack",
        items: [
          "Backend: FastAPI (Python), async everywhere",
          "DB: PostgreSQL (+pgvector), Redis, Chroma/Qdrant",
          "LLM: OpenAI, Anthropic, Google AI, Mistral (LiteLLM)",
          "Orchestration: LangChain + LangGraph",
          "Infra: Docker, Kubernetes, GitHub Actions",
          "Monitoring: Langfuse, Prometheus, Grafana",
          "Frontend: React + TypeScript",
        ],
      },
      {
        id: "features",
        code: "C.4",
        title: "Features to Implement",
        items: [
          "Multi-tenant user management, per-user API keys",
          "Intelligent model routing với cost optimization",
          "RAG pipeline đa document types, streaming responses",
          "Conversation memory (Redis), prompt version management",
          "A/B testing, cost tracking dashboard, billing",
          "Admin panel với full observability",
        ],
      },
    ],
    projects: [
      {
        id: "capstone-main",
        title: "Multi-LLM AI Platform (PrinceSinghAI)",
        difficulty: "hard",
        phase: 18,
        description: "Capstone project — full production multi-LLM platform.",
        features: [
          "Auth + multi-tenant, intelligent routing, fallback chains",
          "RAG engine + agent orchestrator + MCP",
          "Streaming, observability, cost tracking",
          "Deploy Kubernetes với auto-scaling",
        ],
        stack: ["FastAPI", "Redis", "PostgreSQL+pgvector", "LangChain+LangGraph", "OpenAI+Anthropic+Gemini", "Docker", "K8s", "React"],
      },
    ],
  },
];

export const skillTiers: SkillTier[] = [
  {
    tier: 1,
    name: "Must Have",
    subtitle: "Mỗi job AI Engineer đều yêu cầu",
    skills: [
      "Python (advanced async, clean code)",
      "OpenAI API (GPT-4, embeddings, function calling)",
      "Anthropic API (Claude, long context, tool use)",
      "Prompt engineering (structured, production-safe)",
      "RAG architecture (chunking, embeddings, vector DBs)",
      "FastAPI (building AI APIs)",
      "Docker (containerize everything)",
      "Git/GitHub (version control, CI/CD)",
      "PostgreSQL + Redis (databases for AI apps)",
      "LangChain or LlamaIndex basics",
    ],
  },
  {
    tier: 2,
    name: "Highly Valued",
    subtitle: "Giúp bạn nổi bật",
    skills: [
      "Multi-LLM orchestration (routing, fallbacks, cost optimization)",
      "LangGraph (agentic systems)",
      "Fine-tuning với LoRA/QLoRA",
      "HuggingFace ecosystem",
      "Kubernetes (production deployment)",
      "LLMOps (Langfuse, Helicone)",
      "Model Context Protocol (MCP)",
      "Vector databases (Pinecone, Qdrant, Weaviate)",
      "vLLM / TGI (inference optimization)",
      "Multimodal AI (vision, audio)",
    ],
  },
  {
    tier: 3,
    name: "Expert Level",
    subtitle: "Senior/Principal",
    skills: [
      "Custom RLHF / DPO pipelines",
      "Distributed training (DeepSpeed, FSDP)",
      "Custom model architectures",
      "Advanced RAG (HyDE, reranking, contextual compression)",
      "AI system design at scale",
      "ML infrastructure (GPUs, serving)",
      "AI safety and red teaming",
      "Business impact measurement",
    ],
  },
];

export const learningPaths: LearningPath[] = [
  {
    id: "A",
    name: "AI Engineer (Product-Focused)",
    focus: "Tập trung sản phẩm",
    phases: [0, 1, 2, 6, 7, 8, 9, 12, 13, 18],
    timeline: "6-9 tháng",
    description:
      "Đi nhanh vào phần product AI: từ Python nền tảng thẳng sang LLM, orchestration, RAG, agents và ship ra production.",
    accent: "violet",
  },
  {
    id: "B",
    name: "ML Engineer (Research-Focused)",
    focus: "Tập trung nghiên cứu",
    phases: [0, 1, 2, 3, 4, 5, 10, 15, 16, 18],
    timeline: "9-12 tháng",
    description:
      "Đi sâu vào nền tảng ML/DL: math, ML classic, deep learning, NLP, rồi fine-tuning, optimization và RL.",
    accent: "cyan",
  },
  {
    id: "C",
    name: "AI Architect (Systems-Focused)",
    focus: "Tập trung kiến trúc hệ thống",
    phases: [0, 1, 6, 7, 8, 9, 12, 13, 14, 15, 18],
    timeline: "6 tháng (kỹ sư có kinh nghiệm)",
    description:
      "Cho kỹ sư đã có kinh nghiệm: nhảy thẳng vào LLM, orchestration, system design, database và optimization.",
    accent: "emerald",
  },
  {
    id: "D",
    name: "Complete Full Stack AI Engineer",
    focus: "Toàn diện",
    phases: Array.from({ length: 19 }, (_, i) => i),
    timeline: "12-18 tháng",
    description:
      "Đi hết mọi phase + mọi project. Focus: PrinceSinghAI · Multi-LLM · AskAI · CodeLLM · RoadmapAI.",
    accent: "fuchsia",
  },
];

export const resourceGroups: ResourceGroup[] = [
  {
    id: "foundational",
    title: "Foundational",
    items: [
      { topic: "Linear Algebra", resource: "3Blue1Brown — Essence of Linear Algebra (YouTube)" },
      { topic: "Calculus", resource: "3Blue1Brown — Essence of Calculus (YouTube)" },
      { topic: "Probability & Stats", resource: "Statistics 110 — Joe Blitzstein (Harvard)" },
      { topic: "Math for ML", resource: "Mathematics for Machine Learning — Deisenroth (free PDF)" },
      { topic: "Python basics", resource: "Automate the Boring Stuff (free online)" },
      { topic: "NumPy & Pandas", resource: "Python for Data Analysis — Wes McKinney" },
    ],
  },
  {
    id: "deep-learning",
    title: "Deep Learning",
    items: [
      { topic: "Deep Learning", resource: "Andrej Karpathy — Neural Networks: Zero to Hero" },
      { topic: "PyTorch", resource: "fast.ai — Practical Deep Learning" },
      { topic: "Build GPT", resource: "Andrej Karpathy — Let's build GPT" },
      { topic: "Deep Learning Book", resource: "deeplearningbook.org (free)" },
    ],
  },
  {
    id: "llms-ai-engineering",
    title: "LLMs & AI Engineering",
    items: [
      { topic: "LLMs", resource: "Hugging Face NLP Course (free)" },
      { topic: "Transformers", resource: "NLP with Transformers — Tunstall" },
      { topic: "Prompt Engineering", resource: "Anthropic Prompt Engineering Guide" },
      { topic: "LangChain", resource: "LangChain documentation + LangSmith" },
      { topic: "RAG", resource: "LlamaIndex documentation" },
      { topic: "Agents", resource: "LangGraph documentation" },
      { topic: "Fine-tuning", resource: "HuggingFace PEFT documentation" },
    ],
  },
  {
    id: "production-ai",
    title: "Production AI",
    items: [
      { topic: "MLOps", resource: "Made With ML (madewithml.com)" },
      { topic: "LLMOps", resource: "LangSmith + Langfuse documentation" },
      { topic: "System Design", resource: "Designing ML Systems — Chip Huyen" },
      { topic: "AI Engineering", resource: "AI Engineering — Chip Huyen" },
    ],
  },
  {
    id: "stay-current",
    title: "Stay Current",
    items: [
      { topic: "Benchmarks", resource: "Papers With Code" },
      { topic: "Models & techniques", resource: "Hugging Face Blog" },
      { topic: "New APIs", resource: "OpenAI Blog" },
      { topic: "Safety & Claude", resource: "Anthropic Research" },
      { topic: "Industry leaders", resource: "Twitter/X: @karpathy, @sama, @emollick" },
      { topic: "Open-source news", resource: "r/LocalLLaMA" },
      { topic: "Weekly digest", resource: "LLM News (newsletter)" },
    ],
  },
];

/* ---------- Helpers ---------- */

export function getPhaseBySlug(slug: string): Phase | undefined {
  return phases.find((p) => p.slug === slug);
}

export function getPhaseByNumber(n: number): Phase | undefined {
  return phases.find((p) => p.number === n);
}

/**
 * Tìm topic theo id trong một phase (dựa trên slug phase).
 * Trả về { phase, topic, index } để page có thể tính prev/next topic.
 */
export function getTopicInPhase(
  phaseSlug: string,
  topicId: string
): { phase: Phase; topic: Topic; index: number } | undefined {
  const phase = getPhaseBySlug(phaseSlug);
  if (!phase) return undefined;
  const index = phase.topics.findIndex((t) => t.id === topicId);
  if (index === -1) return undefined;
  return { phase, topic: phase.topics[index], index };
}

/** Tất cả cặp (phaseSlug, topicId) — dùng cho generateStaticParams. */
export function allTopicParams(): { slug: string; topic: string }[] {
  return phases.flatMap((p) =>
    p.topics.map((t) => ({ slug: p.slug, topic: t.id }))
  );
}

/** Tất cả project từ mọi phase (flat list) */
export const allProjects = phases.flatMap((p) => p.projects);

export function getProjectById(id: string) {
  return allProjects.find((pr) => pr.id === id);
}

/** Tổng số liệu hiển thị ở hero */
export const stats = {
  phases: phases.length,
  topics: phases.reduce((acc, p) => acc + p.topics.length, 0),
  projects: allProjects.length,
  paths: learningPaths.length,
};
