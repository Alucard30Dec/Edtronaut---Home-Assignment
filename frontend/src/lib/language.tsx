import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Language = 'en' | 'vi';

type Translation = {
  header: {
    platform: string;
    title: string;
    progressExecuteValidate: string;
    backendReachable: string;
    backendNotReachable: string;
    backendChecking: string;
    switchToEnglish: string;
    switchToVietnamese: string;
  };
  appShell: {
    unexpectedError: string;
    sessionStarted: string;
    sessionBootTitle: string;
    sessionBootDescription: string;
    startSessionErrorTitle: string;
    retryStartSession: string;
    executionQueued: string;
    executionCompleted: string;
    executionTimeout: string;
    executionFailed: string;
    sessionNotReady: string;
  };
  runButton: {
    run: string;
    running: string;
    aria: string;
  };
  autosave: {
    saving: string;
    saved: string;
    saveFailed: string;
    waiting: string;
    failedTooltip: string;
    editorSaving: string;
    editorSaved: string;
    editorError: string;
    editorReady: string;
  };
  editor: {
    title: string;
    languageAria: string;
    languagePlaceholder: string;
    pythonMvp: string;
    shortcutHint: string;
  };
  execution: {
    title: string;
    emptyTitle: string;
    emptyDescription: string;
    tabStatus: string;
    tabStdout: string;
    tabStderr: string;
    tabHistory: string;
    executionId: string;
    currentStatus: string;
    executionTime: string;
    noStdout: string;
    noStderr: string;
    historyEmpty: string;
  };
  modules: {
    title: string;
    items: [string, string, string, string];
    contextTitle: string;
    contextDescription: string;
    objectiveTitle: string;
    objectiveDescription: string;
    workspaceStatusTitle: string;
    workspaceReady: string;
    workspaceStarting: string;
  };
  problem: {
    title: string;
    sourceLabel: string;
    sourceUrl: string;
    statementTitle: string;
    statement: string;
    inputTitle: string;
    input: string;
    outputTitle: string;
    output: string;
    constraintsTitle: string;
    constraints: string;
    sampleTitle: string;
    sampleInputLabel: string;
    sampleOutputLabel: string;
    sampleInput: string;
    sampleOutput: string;
    inputLabel: string;
    outputLabel: string;
  };
  resources: {
    title: string;
    quickReferencesTitle: string;
    quickReferences: string[];
    mentorTipTitle: string;
    mentorTip: string;
    notesTitle: string;
    notesPlaceholder: string;
  };
  statusLabels: Record<string, string>;
};

const translations: Record<Language, Translation> = {
  en: {
    header: {
      platform: 'AI Job Simulation Platform',
      title: 'Live Code Execution & Management',
      progressExecuteValidate: 'Step 3 of 5 · Execute & Validate',
      backendReachable: 'Backend reachable',
      backendNotReachable: 'Backend not reachable',
      backendChecking: 'Checking backend health',
      switchToEnglish: 'Switch language to English',
      switchToVietnamese: 'Switch language to Vietnamese',
    },
    appShell: {
      unexpectedError: 'Unexpected error occurred.',
      sessionStarted: 'Simulation session started.',
      sessionBootTitle: 'Preparing your simulation workspace',
      sessionBootDescription: 'Creating a live coding session and loading editor context.',
      startSessionErrorTitle: 'Unable to start coding session',
      retryStartSession: 'Retry Start Session',
      executionQueued: 'Execution queued. Polling for result...',
      executionCompleted: 'Execution completed successfully.',
      executionTimeout: 'Execution timed out.',
      executionFailed: 'Execution failed. Review stderr for details.',
      sessionNotReady: 'Session is not ready.',
    },
    runButton: {
      run: 'Run Code',
      running: 'Running...',
      aria: 'Run code execution',
    },
    autosave: {
      saving: 'Saving...',
      saved: 'Saved',
      saveFailed: 'Save failed',
      waiting: 'Waiting for changes',
      failedTooltip: 'Autosave failed',
      editorSaving: 'Saving draft...',
      editorSaved: 'Draft saved',
      editorError: 'Autosave error',
      editorReady: 'Editor ready',
    },
    editor: {
      title: 'Coding Workspace',
      languageAria: 'Programming language',
      languagePlaceholder: 'Language',
      pythonMvp: 'Python (MVP)',
      shortcutHint: 'Ctrl/Cmd + Enter to run',
    },
    execution: {
      title: 'Execution Results',
      emptyTitle: 'No execution yet',
      emptyDescription: 'Run code to view status, stdout, stderr, and execution history.',
      tabStatus: 'Status',
      tabStdout: 'Stdout',
      tabStderr: 'Stderr',
      tabHistory: 'Execution History',
      executionId: 'Execution ID',
      currentStatus: 'Current Status',
      executionTime: 'Execution Time',
      noStdout: 'No stdout output for this execution.',
      noStderr: 'No stderr output for this execution.',
      historyEmpty: 'Execution history will appear here.',
    },
    modules: {
      title: 'Simulation Modules',
      items: ['Read Brief', 'Implement VL11 Solution', 'Run & Verify', 'Submit Notes'],
      contextTitle: 'Simulation Context',
      contextDescription:
        'You are solving a coding simulation for an interview platform. Reviewers care about correctness, edge-case handling, and clear implementation choices.',
      objectiveTitle: 'Current objective',
      objectiveDescription: 'Match VL11 output contract exactly: print YES for prime and NO otherwise.',
      workspaceStatusTitle: 'Workspace status',
      workspaceReady: 'Session is active. Run code to validate VL11 outputs (YES/NO).',
      workspaceStarting: 'Starting session...',
    },
    problem: {
      title: 'Simulation Brief (VL11)',
      sourceLabel: 'Source',
      sourceUrl: 'https://luyencode.net/problem/vl11',
      statementTitle: 'Problem',
      statement: 'Given an integer n, determine whether n is a prime number.',
      inputTitle: 'Input',
      input: 'One integer n.',
      outputTitle: 'Output',
      output: 'Print YES if n is prime, otherwise print NO.',
      constraintsTitle: 'Constraints',
      constraints: '|n| <= 10^12',
      sampleTitle: 'Sample',
      sampleInputLabel: 'Input',
      sampleOutputLabel: 'Output',
      sampleInput: '7',
      sampleOutput: 'YES',
      inputLabel: 'Input',
      outputLabel: 'Output',
    },
    resources: {
      title: 'Resources & Notes',
      quickReferencesTitle: 'Quick references',
      quickReferences: [
        'Handle n < 2 first (not prime).',
        'Check divisors up to sqrt(n) only.',
        'Skip even divisors after handling n == 2.',
        'Keep output format exact: YES / NO.',
      ],
      mentorTipTitle: 'Mentor tip',
      mentorTip:
        'In your notes, explain why your solution is O(sqrt(n)) and why this is enough for |n| <= 10^12.',
      notesTitle: 'Interview Notes',
      notesPlaceholder:
        'Example: I used trial division up to sqrt(n), handled n < 2 first, and ensured exact YES/NO output format.',
    },
    statusLabels: {
      ONLINE: 'ONLINE',
      OFFLINE: 'OFFLINE',
      CHECKING: 'CHECKING',
      ACTIVE: 'ACTIVE',
      QUEUED: 'QUEUED',
      RUNNING: 'RUNNING',
      COMPLETED: 'COMPLETED',
      FAILED: 'FAILED',
      TIMEOUT: 'TIMEOUT',
    },
  },
  vi: {
    header: {
      platform: 'Nền tảng mô phỏng công việc AI',
      title: 'Thực Thi Mã Trực Tiếp & Quản Lý',
      progressExecuteValidate: 'Bước 3/5 · Chạy và Xác Minh',
      backendReachable: 'Backend đã kết nối',
      backendNotReachable: 'Không thể kết nối backend',
      backendChecking: 'Đang kiểm tra trạng thái backend',
      switchToEnglish: 'Chuyển ngôn ngữ sang tiếng Anh',
      switchToVietnamese: 'Chuyển ngôn ngữ sang tiếng Việt',
    },
    appShell: {
      unexpectedError: 'Đã xảy ra lỗi không mong muốn.',
      sessionStarted: 'Đã tạo phiên mô phỏng thành công.',
      sessionBootTitle: 'Đang chuẩn bị không gian mô phỏng',
      sessionBootDescription: 'Đang tạo phiên live coding và nạp ngữ cảnh editor.',
      startSessionErrorTitle: 'Không thể khởi tạo phiên coding',
      retryStartSession: 'Thử tạo lại phiên',
      executionQueued: 'Đã đưa lượt chạy vào hàng đợi. Đang theo dõi kết quả...',
      executionCompleted: 'Chạy mã thành công.',
      executionTimeout: 'Lượt chạy đã hết thời gian.',
      executionFailed: 'Lượt chạy thất bại. Hãy kiểm tra stderr để biết chi tiết.',
      sessionNotReady: 'Phiên làm bài chưa sẵn sàng.',
    },
    runButton: {
      run: 'Chạy Mã',
      running: 'Đang chạy...',
      aria: 'Chạy thực thi mã',
    },
    autosave: {
      saving: 'Đang lưu...',
      saved: 'Đã lưu',
      saveFailed: 'Lưu thất bại',
      waiting: 'Đang chờ thay đổi',
      failedTooltip: 'Tự động lưu thất bại',
      editorSaving: 'Đang lưu bản nháp...',
      editorSaved: 'Đã lưu bản nháp',
      editorError: 'Lỗi tự động lưu',
      editorReady: 'Editor sẵn sàng',
    },
    editor: {
      title: 'Không Gian Viết Mã',
      languageAria: 'Ngôn ngữ lập trình',
      languagePlaceholder: 'Ngôn ngữ',
      pythonMvp: 'Python (MVP)',
      shortcutHint: 'Ctrl/Cmd + Enter để chạy',
    },
    execution: {
      title: 'Kết Quả Thực Thi',
      emptyTitle: 'Chưa có lượt chạy nào',
      emptyDescription: 'Hãy chạy mã để xem trạng thái, stdout, stderr và lịch sử thực thi.',
      tabStatus: 'Trạng thái',
      tabStdout: 'Stdout',
      tabStderr: 'Stderr',
      tabHistory: 'Lịch sử chạy',
      executionId: 'Mã thực thi',
      currentStatus: 'Trạng thái hiện tại',
      executionTime: 'Thời gian thực thi',
      noStdout: 'Không có dữ liệu stdout cho lượt chạy này.',
      noStderr: 'Không có dữ liệu stderr cho lượt chạy này.',
      historyEmpty: 'Lịch sử thực thi sẽ hiển thị tại đây.',
    },
    modules: {
      title: 'Các Bước Mô Phỏng',
      items: ['Đọc đề', 'Cài đặt lời giải VL11', 'Chạy & xác minh', 'Gửi ghi chú'],
      contextTitle: 'Bối cảnh bài mô phỏng',
      contextDescription:
        'Bạn đang làm bài mô phỏng coding cho nền tảng phỏng vấn. Người review tập trung vào tính đúng, xử lý edge case và cách trình bày giải pháp rõ ràng.',
      objectiveTitle: 'Mục tiêu hiện tại',
      objectiveDescription: 'Bám đúng format VL11: in YES nếu là số nguyên tố, ngược lại in NO.',
      workspaceStatusTitle: 'Trạng thái workspace',
      workspaceReady: 'Phiên đã sẵn sàng. Hãy chạy mã để kiểm tra output VL11 (YES/NO).',
      workspaceStarting: 'Đang khởi tạo phiên...',
    },
    problem: {
      title: 'Tóm Tắt Bài Toán',
      sourceLabel: 'Nguồn',
      sourceUrl: 'https://luyencode.net/problem/vl11',
      statementTitle: 'Đề bài',
      statement: 'Cho số nguyên n, hãy kiểm tra n có phải là số nguyên tố hay không.',
      inputTitle: 'Input',
      input: 'Một số nguyên n.',
      outputTitle: 'Output',
      output: 'In YES nếu n là số nguyên tố, ngược lại in NO.',
      constraintsTitle: 'Ràng buộc',
      constraints: '|n| <= 10^12',
      sampleTitle: 'Ví dụ',
      sampleInputLabel: 'Input',
      sampleOutputLabel: 'Output',
      sampleInput: '7',
      sampleOutput: 'YES',
      inputLabel: 'Input',
      outputLabel: 'Output',
    },
    resources: {
      title: 'Tài Nguyên & Ghi Chú',
      quickReferencesTitle: 'Gợi ý nhanh',
      quickReferences: [
        'Ưu tiên xử lý n < 2 trước (không phải số nguyên tố).',
        'Chỉ kiểm tra ước đến sqrt(n).',
        'Sau khi xử lý n == 2, có thể bỏ qua các ước chẵn.',
        'Giữ output chính xác: YES / NO.',
      ],
      mentorTipTitle: 'Gợi ý từ mentor',
      mentorTip:
        'Trong phần ghi chú, hãy giải thích vì sao O(sqrt(n)) là đủ với ràng buộc |n| <= 10^12.',
      notesTitle: 'Ghi chú phỏng vấn',
      notesPlaceholder:
        'Ví dụ: Em dùng trial division tới sqrt(n), xử lý n < 2 trước và đảm bảo output chỉ YES/NO.',
    },
    statusLabels: {
      ONLINE: 'TRỰC TUYẾN',
      OFFLINE: 'MẤT KẾT NỐI',
      CHECKING: 'ĐANG KIỂM TRA',
      ACTIVE: 'ĐANG HOẠT ĐỘNG',
      QUEUED: 'ĐANG XẾP HÀNG',
      RUNNING: 'ĐANG CHẠY',
      COMPLETED: 'HOÀN THÀNH',
      FAILED: 'THẤT BẠI',
      TIMEOUT: 'HẾT THỜI GIAN',
    },
  },
};

const LANGUAGE_STORAGE_KEY = 'live_code_ui_language';

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: Translation;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getInitialLanguage(): Language {
  if (typeof window === 'undefined') {
    return 'en';
  }

  const storedValue = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (storedValue === 'en' || storedValue === 'vi') {
    return storedValue;
  }

  return window.navigator.language.toLowerCase().startsWith('vi') ? 'vi' : 'en';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => getInitialLanguage());

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: translations[language],
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider.');
  }

  return context;
}
