import type { ScanResult } from '../scanner.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getLogoDataUri(): string {
  try {
    const logoPath = resolve(process.cwd(), 'images', 'logo.webp');
    const buf = readFileSync(logoPath);
    return 'data:image/webp;base64,' + buf.toString('base64');
  } catch {
    return '';
  }
}

const logoDataUri = getLogoDataUri();

const translations: Record<string, Record<string, string>> = {
  en: {
    reportTitle: 'Website Scan Report',
    errors: 'Errors',
    warnings: 'Warnings',
    passed: 'Passed',
    total: 'Total',
    issuesFound: 'Issues Found',
    warningsOnly: 'Warnings Only',
    allClear: 'All Clear',
    generated: 'Generated',
    findings: 'Findings',
    severity: 'Severity',
    type: 'Type',
    message: 'Message',
    element: 'Element',
    url: 'URL',
    suggestion: 'Suggestion',
    jsErrors: 'JavaScript Errors',
    consoleErrors: 'Console Errors',
    failedResources: 'Failed Resources',
    noIssues: 'No issues found — everything looks good!',
    footer: 'Scanly — Website Content Checker',
    'error': 'Error',
    'warning': 'Warning',
    'info': 'Info',
  },
  ja: {
    reportTitle: 'ウェブサイトスキャンレポート',
    errors: 'エラー',
    warnings: '警告',
    passed: '合格',
    total: '合計',
    issuesFound: '問題が見つかりました',
    warningsOnly: '警告のみ',
    allClear: 'クリア',
    generated: '生成日時',
    findings: '発見された問題',
    severity: '重大度',
    type: '種類',
    message: 'メッセージ',
    element: '要素',
    url: 'URL',
    suggestion: '修正案',
    jsErrors: 'JavaScriptエラー',
    consoleErrors: 'コンソールエラー',
    failedResources: '読み込み失敗リソース',
    noIssues: '問題はありませんでした！',
    footer: 'Scanly — ウェブサイトコンテンツチェッカー',
    'error': 'エラー',
    'warning': '警告',
    'info': '情報',
  },
  zh: {
    reportTitle: '网站扫描报告',
    errors: '错误',
    warnings: '警告',
    passed: '通过',
    total: '总计',
    issuesFound: '发现问题',
    warningsOnly: '仅有警告',
    allClear: '全部通过',
    generated: '生成时间',
    findings: '发现的问题',
    severity: '严重程度',
    type: '类型',
    message: '消息',
    element: '元素',
    url: 'URL',
    suggestion: '建议',
    jsErrors: 'JavaScript 错误',
    consoleErrors: '控制台错误',
    failedResources: '加载失败的资源',
    noIssues: '没有问题！一切正常。',
    footer: 'Scanly — 网站内容检查器',
    'error': '错误',
    'warning': '警告',
    'info': '信息',
  },
  'zh-TW': {
    reportTitle: '網站掃描報告',
    errors: '錯誤',
    warnings: '警告',
    passed: '通過',
    total: '總計',
    issuesFound: '發現問題',
    warningsOnly: '僅有警告',
    allClear: '全部通過',
    generated: '生成時間',
    findings: '發現的問題',
    severity: '嚴重程度',
    type: '類型',
    message: '訊息',
    element: '元素',
    url: 'URL',
    suggestion: '建議',
    jsErrors: 'JavaScript 錯誤',
    consoleErrors: '控制台錯誤',
    failedResources: '載入失敗的資源',
    noIssues: '沒有問題！一切正常。',
    footer: 'Scanly — 網站內容檢查器',
    'error': '錯誤',
    'warning': '警告',
    'info': '資訊',
  },
  ko: {
    reportTitle: '웹사이트 스캔 보고서',
    errors: '오류',
    warnings: '경고',
    passed: '통과',
    total: '합계',
    issuesFound: '문제 발견',
    warningsOnly: '경고만 있음',
    allClear: '전체 통과',
    generated: '생성 시각',
    findings: '발견된 문제',
    severity: '중요도',
    type: '유형',
    message: '메시지',
    element: '요소',
    url: 'URL',
    suggestion: '제안',
    jsErrors: 'JavaScript 오류',
    consoleErrors: '콘솔 오류',
    failedResources: '로드 실패 리소스',
    noIssues: '문제가 없습니다! 모든 항목이 정상입니다.',
    footer: 'Scanly — 웹사이트 콘텐츠 체크러',
    'error': '오류',
    'warning': '경고',
    'info': '정보',
  },
  ms: {
    reportTitle: 'Laporan Imbasan Laman Web',
    errors: 'Ralat',
    warnings: 'Amaran',
    passed: 'Lulus',
    total: 'Jumlah',
    issuesFound: 'Masalah Ditemui',
    warningsOnly: 'Amaran Sahaja',
    allClear: 'Semua Lulus',
    generated: 'Dijana',
    findings: 'Masalah Ditemui',
    severity: 'Tahap',
    type: 'Jenis',
    message: 'Mesej',
    element: 'Elemen',
    url: 'URL',
    suggestion: 'Cadangan',
    jsErrors: 'Ralat JavaScript',
    consoleErrors: 'Ralat Konsol',
    failedResources: 'Sumber Gagal Dimuat',
    noIssues: 'Tiada masalah ditemui — semuanya baik!',
    footer: 'Scanly — Pemeriksa Kandungan Laman Web',
    'error': 'Ralat',
    'warning': 'Amaran',
    'info': 'Maklumat',
  },
};

const suggestionPatterns: Record<string, Array<{ en: string; translation: string }>> = {
  'missing-alt': [
    { en: 'Add descriptive alt text:', translation: '添加描述性alt文本：' },
    { en: 'Add descriptive alt text:', translation: '添加描述性alt文字：' },
    { en: 'Add descriptive alt text:', translation: '説明的なaltテキストを追加してください:' },
    { en: 'Add descriptive alt text:', translation: '추가적인 설명 alt 텍스트를 추가하세요:' },
    { en: 'Add descriptive alt text:', translation: 'Tambahkan alt teks yang menerangkan:' },
  ],
};

export function translateSuggestion(lang: string, suggestion: string): string {
  if (!suggestion) return suggestion;

  const langMap: Record<string, Record<string, string>> = {
    'missing-alt': {
      en: 'Add descriptive alt text:',
      ja: '説明的なaltテキストを追加してください:',
      zh: '添加描述性alt文本：',
      'zh-TW': '添加描述性alt文字：',
      ko: '추가적인 설명 alt 텍스트를 추가하세요:',
      ms: 'Tambahkan alt teks yang menerangkan:',
    },
    'format-mix': {
      en: 'Use WebP or AVIF for optimized image delivery',
      ja: '最適化された画像配信にはWebPまたはAVIFを使用してください',
      zh: '使用WebP或AVIF进行优化的图像交付',
      'zh-TW': '使用WebP或AVIF進行優化的圖像交付',
      ko: '최적화된 이미지 전달을 위해 WebP 또는 AVIF를 사용하세요',
      ms: 'Gunakan WebP atau AVIF untuk penghantaran imej yang dioptimumkan',
    },
    'unsupported-format': {
      en: 'Consider converting to WebP or PNG for better compatibility',
      ja: 'より良い互換性のためにWebPまたはPNGに変換することを検討してください',
      zh: '考虑转换为WebP或PNG以获得更好的兼容性',
      'zh-TW': '考慮轉換為WebP或PNG以獲得更好的相容性',
      ko: '더 나은 호환성을 위해 WebP 또는 PNG로 변환하는 것을 고려하세요',
      ms: 'Pertimbangkan untuk menukar kepada WebP atau PNG untuk keserasian yang lebih baik',
    },
    'error-render': {
      en: 'Fix the image path or ensure the file exists',
      ja: '画像パスを修正するか、ファイルが存在することを確認してください',
      zh: '修复图像路径或确保文件存在',
      'zh-TW': '修復圖像路徑或確保檔案存在',
      ko: '이미지 경로를 수정하거나 파일이 존재하는지 확인하세요',
      ms: 'Betulkan laluan imej atau pastikan fail wujud',
    },
    'iframe-render': {
      en: 'Fix the iframe source URL',
      ja: 'iframeのソースURLを修正してください',
      zh: '修复iframe源URL',
      'zh-TW': '修復iframe源URL',
      ko: 'iframe 소스 URL을 수정하세요',
      ms: 'Betulkan URL sumber iframe',
    },
    'noscript': {
      en: 'Use progressive enhancement instead of heavy noscript reliance',
      ja: 'noscriptへの依存ではなくプログレッシブエンハンスメントを使用してください',
      zh: '使用渐进式增强而不是过度依赖noscript',
      'zh-TW': '使用漸進式增強而不是過度依賴noscript',
      ko: 'noscript에 대한 과도한 의존 대신 점진적 향상을 사용하세요',
      ms: 'Gunakan peningkatan progresif bergantung kepada noscript',
    },
  };

  if (suggestion.toLowerCase().includes('alt text')) {
    const translations = langMap['missing-alt'];
    return translations[lang] || translations.en;
  }

  if (suggestion.toLowerCase().includes('webp or avif')) {
    const translations = langMap['format-mix'];
    return translations[lang] || translations.en;
  }

  if (suggestion.toLowerCase().includes('converting to webp or png')) {
    const translations = langMap['unsupported-format'];
    return translations[lang] || translations.en;
  }

  if (suggestion.toLowerCase().includes('fix the image path')) {
    const translations = langMap['error-render'];
    return translations[lang] || translations.en;
  }

  if (suggestion.toLowerCase().includes('fix the iframe')) {
    const translations = langMap['iframe-render'];
    return translations[lang] || translations.en;
  }

  if (suggestion.toLowerCase().includes('progressive enhancement')) {
    const translations = langMap['noscript'];
    return translations[lang] || translations.en;
  }

  return suggestion;
}

export function translateMessage(lang: string, type: string, message: string): string {
  const replacements: Record<string, Record<string, Record<string, string>>> = {
    'missing-alt': {
      'Image is missing alt text': {
        en: 'Image is missing alt text',
        ja: '画像にaltテキストがありません',
        zh: '图片缺少alt文本',
        'zh-TW': '圖片缺少alt文字',
        ko: '이미지에 alt 텍스트가 없습니다',
        ms: 'Imej tidak mempunyai alt teks',
      },
      'alt text is too generic: "{{text}}"': {
        en: 'alt text is too generic: "{{text}}"',
        ja: 'altテキストが汎用的すぎます: "{{text}}"',
        zh: 'alt文本过于笼统："{{text}}"',
        'zh-TW': 'alt文字過於籠統："{{text}}"',
        ko: 'alt 텍스트가 너무 일반적입니다: "{{text}}"',
        ms: 'alt teks terlalu umum: "{{text}}"',
      },
    },
    'empty-picture': {
      'Image has empty or missing src attribute': {
        en: 'Image has empty or missing src attribute',
        ja: '画像のsrc属性が空または欠落しています',
        zh: '图片的src属性为空或缺失',
        'zh-TW': '圖片的src屬性為空或缺失',
        ko: '이미지의 src 속성이 비어 있거나 누락되었습니다',
        ms: 'Imej mempunyai atribut src yang kosong atau hilang',
      },
      'Image source is broken: {{url}} (HTTP {{status}})': {
        en: 'Image source is broken: {{url}} (HTTP {{status}})',
        ja: '画像ソースが壊れています: {{url}} (HTTP {{status}})',
        zh: '图片源已损坏：{{url}} (HTTP {{status}})',
        'zh-TW': '圖片源已損壞：{{url}} (HTTP {{status}})',
        ko: '이미지 소스가 손상되었습니다: {{url}} (HTTP {{status}})',
        ms: 'Sumber imej rosak: {{url}} (HTTP {{status}})',
      },
    },
    'error-render': {
      'Image failed to render: {{url}}': {
        en: 'Image failed to render: {{url}}',
        ja: '画像のレンダリングに失敗しました: {{url}}',
        zh: '图片渲染失败：{{url}}',
        'zh-TW': '圖片渲染失敗：{{url}}',
        ko: '이미지 렌더링에 실패했습니다: {{url}}',
        ms: 'Imej gagal dirender: {{url}}',
      },
    },
    'empty-button': {
      'Button has no visible text, aria-label, title, or icon': {
        en: 'Button has no visible text, aria-label, title, or icon',
        ja: 'ボタンに表示テキスト、aria-label、タイトル、またはアイコンがありません',
        zh: '按钮没有可见文本、aria-label、标题或图标',
        'zh-TW': '按鈕沒有可見文字、aria-label、標題或圖示',
        ko: '버튼에 표시 텍스트, aria-label, 제목 또는 아이콘이 없습니다',
        ms: 'Butang tidak mempunyai teks, aria-label, tajuk, atau ikon yang kelihatan',
      },
    },
    'broken-link': {
      'Broken link: {{url}} (HTTP {{status}})': {
        en: 'Broken link: {{url}} (HTTP {{status}})',
        ja: 'リンクが壊れています: {{url}} (HTTP {{status}})',
        zh: '链接已损坏：{{url}} (HTTP {{status}})',
        'zh-TW': '連結已損壞：{{url}} (HTTP {{status}})',
        ko: '링크가 손상되었습니다: {{url}} (HTTP {{status}})',
        ms: 'Pautan rosak: {{url}} (HTTP {{status}})',
      },
      'Broken link: {{url}} (network error or timeout)': {
        en: 'Broken link: {{url}} (network error or timeout)',
        ja: 'リンクが壊れています: {{url}} (ネットワークエラーまたはタイムアウト)',
        zh: '链接已损坏：{{url}} (网络错误或超时)',
        'zh-TW': '連結已損壞：{{url}} (網路錯誤或超時)',
        ko: '링크가 손상되었습니다: {{url}} (네트워크 오류 또는 시간 초과)',
        ms: 'Pautan rosak: {{url}} (ralat rangkaian atau tamat masa)',
      },
    },
    'format-mix': {
      'Image uses {{format}} — consider standardizing to WebP for better compression': {
        en: 'Image uses {{format}} — consider standardizing to WebP for better compression',
        ja: '画像は{{format}}形式を使用しています — より良い圧縮のためWebPに統一することを検討してください',
        zh: '图片使用{{format}}格式 — 考虑统一为WebP以获得更好的压缩',
        'zh-TW': '圖片使用{{format}}格式 — 考慮統一為WebP以獲得更好的壓縮',
        ko: '이미지가 {{format}} 형식을 사용합니다 — 더 나은 압축을 위해 WebP로 표준화하는 것을 고려하세요',
        ms: 'Imej menggunakan {{format}} — pertimbangkan untuk piawaikan kepada WebP untuk mampatan yang lebih baik',
      },
    },
    'unsupported-format': {
      'Image uses uncommon format: .{{format}}': {
        en: 'Image uses uncommon format: .{{format}}',
        ja: '画像は非標準の形式です: .{{format}}',
        zh: '图片使用不常见的格式：.{{format}}',
        'zh-TW': '圖片使用不常見的格式：.{{format}}',
        ko: '이미지가 흔하지 않은 형식을 사용합니다: .{{format}}',
        ms: 'Imej menggunakan format yang tidak biasa: .{{format}}',
      },
    },
  };

  const langReplacements = replacements[type];
  if (!langReplacements) return message;

  for (const [enPattern, langTranslations] of Object.entries(langReplacements)) {
    if (message === enPattern || message.startsWith(enPattern.split('{{')[0])) {
      const translated = langTranslations[lang] || langTranslations.en;
      // Replace placeholders with actual values from the original message
      let result = translated;
      const urlMatch = message.match(/(https?:\/\/[^\s)]+)/);
      if (urlMatch) result = result.replace(/\{\{url\}\}/g, urlMatch[1]);
      const statusMatch = message.match(/HTTP (\d+)/);
      if (statusMatch) result = result.replace(/\{\{status\}\}/g, statusMatch[1]);
      const formatMatch = message.match(/(?:\.(\w+))|(?:uses\s+([A-Z]+))/);
      if (formatMatch) {
        const format = formatMatch[1] || formatMatch[2];
        if (format) result = result.replace(/\{\{format\}\}/g, format.toUpperCase());
      }
      const altMatch = message.match(/"([^"]+)"/);
      if (altMatch) result = result.replace(/\{\{text\}\}/g, altMatch[1]);
      return result;
    }
  }

  return message;
}

function t(lang: string, key: string): string {
  const langData = translations[lang] || translations.en;
  return langData[key] || translations.en[key] || key;
}

export function reportHtml(result: ScanResult, lang = 'en'): string {
  const issuesHtml = result.issues
    .map(issue => {
      const severityClass = issue.severity;
      const severityLabel = t(lang, issue.severity);
      return `
        <tr class="issue-row ${severityClass}">
          <td><span class="badge badge-${severityClass}">${severityLabel}</span></td>
          <td class="issue-type">${escapeHtml(issue.type)}</td>
          <td class="issue-message">${escapeHtml(translateMessage(lang, issue.type, issue.message))}</td>
          <td class="issue-element">${escapeHtml(issue.element || '')}</td>
          <td class="issue-url"><a href="${escapeHtml(issue.url)}" target="_blank">${escapeHtml(issue.url)}</a></td>
          ${issue.suggestion ? `<td class="issue-suggestion">${escapeHtml(translateSuggestion(lang, issue.suggestion))}</td>` : ''}
        </tr>`;
    })
    .join('');

  const jsErrorsHtml = result.jsErrors
    .map(err => `<tr><td class="error-type">${t(lang, 'jsErrors')}</td><td class="error-msg">${escapeHtml(err)}</td></tr>`)
    .join('');

  const consoleErrorsHtml = result.consoleErrors
    .map(err => `<tr><td class="error-type">${t(lang, 'consoleErrors')}</td><td class="error-msg">${escapeHtml(err)}</td></tr>`)
    .join('');

  const failedResponsesHtml = result.failedResponses
    .map(resp => `<tr><td class="error-type">${t(lang, 'failedResources')}</td><td class="error-msg">${escapeHtml(resp.url)} (HTTP ${resp.status})</td></tr>`)
    .join('');

  const { errors, warnings, info } = result.summary;
  const statusColor = errors > 0 ? '#dc2626' : warnings > 0 ? '#d97706' : '#16a34a';
  const statusText = errors > 0 ? t(lang, 'issuesFound') : warnings > 0 ? t(lang, 'warningsOnly') : t(lang, 'allClear');
  const statusBg = errors > 0 ? '#fef2f2' : warnings > 0 ? '#fffbeb' : '#f0fdf4';

  const generatedDate = new Date().toLocaleString(lang === 'en' ? 'en-US' : lang === 'ja' ? 'ja-JP' : lang === 'zh' ? 'zh-CN' : lang === 'zh-TW' ? 'zh-TW' : lang === 'ko' ? 'ko-KR' : lang === 'ms' ? 'ms-MY' : 'en-US');

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t(lang, 'reportTitle')} — ${escapeHtml(result.url)}</title>
  <style>
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #e5e5e5;
      color: #1a1a1a;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: #fff;
      position: relative;
      overflow: hidden;
    }
    .accent-bar { height: 6px; background: linear-gradient(90deg, #111 0%, #333 100%); }
    .report-header { padding: 32mm 20mm 8mm 20mm; display: flex; align-items: flex-start; justify-content: space-between; }
    .header-left { display: flex; align-items: center; gap: 16px; }
    .logo { width: 60px; height: 60px; border-radius: 6px; object-fit: contain; }
    .brand h1 { font-size: 1.1rem; font-weight: 700; color: #111; letter-spacing: 2px; text-transform: uppercase; }
    .brand .report-label { font-size: 0.7rem; color: #888; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 2px; }
    .header-right { text-align: right; }
    .stamp { display: inline-block; border: 2px solid #111; padding: 4px 14px; font-size: 0.65rem; font-weight: 700; letter-spacing: 3px; color: #111; margin-bottom: 8px; }
    .meta { font-size: 0.72rem; color: #888; line-height: 1.6; }
    .meta a { color: #2563eb; text-decoration: none; word-break: break-all; }
    .divider { height: 1px; background: #e5e5e5; margin: 0 20mm; }
    .summary-section { padding: 10mm 20mm; display: flex; gap: 8px; justify-content: center; }
    .stat-card { flex: 1; max-width: 140px; text-align: center; padding: 10px 8px; border: 1px solid #e5e5e5; border-radius: 6px; background: #fafafa; }
    .stat-card .number { font-size: 1.8rem; font-weight: 700; line-height: 1; }
    .stat-card .label { font-size: 0.6rem; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
    .stat-card.total .number { color: #111; }
    .stat-card.errors .number { color: #dc2626; }
    .stat-card.warnings .number { color: #d97706; }
    .stat-card.info .number { color: #0284c7; }
    .status-banner { text-align: center; padding: 6px 20mm; font-size: 0.8rem; font-weight: 600; }
    .content { padding: 6mm 20mm 10mm 20mm; }
    .section-title { font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #111; margin-bottom: 6px; padding-top: 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8mm; font-size: 0.75rem; }
    thead th { background: #f9fafb; padding: 8px 10px; text-align: left; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.5px; color: #374151; border-bottom: 2px solid #e5e5e5; font-weight: 600; }
    thead th:nth-child(1) { width: 10%; }
    thead th:nth-child(2) { width: 12%; }
    thead th:nth-child(3) { width: 25%; }
    thead th:nth-child(4) { width: 15%; }
    thead th:nth-child(5) { width: 18%; }
    thead th:nth-child(6) { width: 20%; }
    tbody td { padding: 8px 10px; border-top: 1px solid #f3f4f6; vertical-align: top; }
    tbody tr.issue-row.error { border-left: 2px solid #dc2626; }
    tbody tr.issue-row.warning { border-left: 2px solid #d97706; }
    tbody tr.issue-row.info { border-left: 2px solid #06b6d4; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 0.6rem; font-weight: 700; letter-spacing: 0.5px; }
    .badge-error { background: #fef2f2; color: #dc2626; }
    .badge-warning { background: #fffbeb; color: #d97706; }
    .badge-info { background: #ecfeff; color: #0284c7; }
    .issue-type { color: #6b7280; font-family: monospace; font-size: 0.7rem; }
    .issue-element { font-family: monospace; font-size: 0.68rem; color: #6b7280; word-break: break-all; }
    .issue-url { color: #2563eb; word-break: break-all; font-size: 0.7rem; }
    .issue-suggestion { color: #16a34a; font-size: 0.7rem; }
    .error-msg { color: #dc2626; word-break: break-all; font-size: 0.7rem; }
    .no-issues { text-align: center; padding: 12mm 0; color: #16a34a; font-size: 0.85rem; font-weight: 500; }
    .report-footer { position: absolute; bottom: 0; left: 0; right: 0; padding: 6mm 20mm; border-top: 1px solid #e5e5e5; display: flex; justify-content: space-between; align-items: center; }
    .report-footer .footer-left { font-size: 0.65rem; color: #aaa; letter-spacing: 0.5px; }
    .report-footer .footer-right { font-size: 0.65rem; color: #aaa; }
  </style>
</head>
<body>
  <div class="page">
    <div class="accent-bar"></div>
    <div class="report-header">
      <div class="header-left">
        <img src="${logoDataUri || 'images/logo.webp'}" alt="Scanly" class="logo">
        <div class="brand">
          <h1>Scanly</h1>
          <div class="report-label">${t(lang, 'reportTitle')}</div>
        </div>
      </div>
      <div class="header-right">
        <div class="stamp">SCANLY</div>
        <div class="meta">
          <a href="${escapeHtml(result.url)}" target="_blank">${escapeHtml(result.url)}</a><br>
          ${t(lang, 'generated')}: ${generatedDate}
        </div>
      </div>
    </div>
    <div class="divider"></div>
    <div class="summary-section">
      <div class="stat-card total"><div class="number">${result.summary.total}</div><div class="label">${t(lang, 'total')}</div></div>
      <div class="stat-card errors"><div class="number">${errors}</div><div class="label">${t(lang, 'errors')}</div></div>
      <div class="stat-card warnings"><div class="number">${warnings}</div><div class="label">${t(lang, 'warnings')}</div></div>
      <div class="stat-card info"><div class="number">${info}</div><div class="label">${t(lang, 'passed')}</div></div>
    </div>
    <div class="status-banner" style="color:${statusColor}; background:${statusBg};">${statusText}</div>
    <div class="content">
      ${result.jsErrors.length > 0 ? `
      <div class="section-title" style="color:#dc2626;">${t(lang, 'jsErrors')} (${result.jsErrors.length})</div>
      <table><thead><tr><th>${t(lang, 'type')}</th><th>${t(lang, 'message')}</th></tr></thead><tbody>${jsErrorsHtml}</tbody></table>` : ''}
      ${result.consoleErrors.length > 0 ? `
      <div class="section-title" style="color:#d97706;">${t(lang, 'consoleErrors')} (${result.consoleErrors.length})</div>
      <table><thead><tr><th>${t(lang, 'type')}</th><th>${t(lang, 'message')}</th></tr></thead><tbody>${consoleErrorsHtml}</tbody></table>` : ''}
      ${result.failedResponses.length > 0 ? `
      <div class="section-title" style="color:#0284c7;">${t(lang, 'failedResources')} (${result.failedResponses.length})</div>
      <table><thead><tr><th>${t(lang, 'type')}</th><th>${t(lang, 'message')}</th></tr></thead><tbody>${failedResponsesHtml}</tbody></table>` : ''}
      ${result.issues.length > 0 ? `
      <div class="section-title">${t(lang, 'findings')} (${result.issues.length})</div>
      <table>
        <thead>
          <tr><th>${t(lang, 'severity')}</th><th>${t(lang, 'type')}</th><th>${t(lang, 'message')}</th><th>${t(lang, 'element')}</th><th>${t(lang, 'url')}</th><th>${t(lang, 'suggestion')}</th></tr>
        </thead>
        <tbody>${issuesHtml}</tbody>
      </table>` : '<div class="no-issues">' + t(lang, 'noIssues') + '</div>'}
    </div>
    <div class="report-footer">
      <div class="footer-left">${t(lang, 'footer')}</div>
      <div class="footer-right">${new Date().toLocaleDateString(lang === 'en' ? 'en-US' : lang === 'ja' ? 'ja-JP' : lang === 'zh' ? 'zh-CN' : lang === 'zh-TW' ? 'zh-TW' : lang === 'ko' ? 'ko-KR' : lang === 'ms' ? 'ms-MY' : 'en-US')}</div>
    </div>
  </div>
</body>
</html>`;
}
