// Migration notice only: never reads, modifies or deletes editor drafts.
(() => {
  const notice = document.querySelector('.migration-notice[data-editor="true"]');
  if (!notice) return;
  const messages = {
    en: ['Names Editor has a new home', 'Saved drafts stay in this browser at the old address. Resume your draft here, download JSON, then open that file in the new editor. Keep the old draft until you verify the transfer. Nothing moves automatically.', 'Open new Names Editor (new tab)'],
    ko: ['이름 편집기의 새 주소', '저장한 초안은 이 브라우저의 이전 주소에 남아 있습니다. 여기서 초안을 이어서 열고 JSON을 다운로드한 다음, 새 편집기에서 그 파일을 여세요. 옮겨진 내용을 확인할 때까지 기존 초안을 보관하세요. 초안은 자동으로 이전되지 않습니다.', '새 이름 편집기 열기 (새 탭)'],
    ja: ['名前エディターの新しいアドレス', '保存済みの下書きは、このブラウザーの旧アドレスに残っています。ここで下書きを再開してJSONをダウンロードし、新しいエディターでそのファイルを開いてください。移行を確認するまで古い下書きを残してください。自動では移行されません。', '新しい名前エディターを開く（新しいタブ）'],
    de: ['Der Namenseditor hat eine neue Adresse', 'Gespeicherte Entwürfe bleiben in diesem Browser unter der alten Adresse. Öffne deinen Entwurf hier, lade die JSON-Datei herunter und öffne sie im neuen Editor. Behalte den alten Entwurf, bis du die Übertragung geprüft hast. Es wird nichts automatisch übertragen.', 'Neuen Namenseditor öffnen (neuer Tab)']
  };
  const render = () => {
    const requested = document.getElementById('language')?.value || new URLSearchParams(location.search).get('lang');
    const language = Object.hasOwn(messages, requested) ? requested : 'en';
    const [title, copy, label] = messages[language];
    notice.lang = language;
    notice.setAttribute('aria-label', title);
    document.getElementById('migration-title').textContent = title;
    document.getElementById('migration-copy').textContent = copy;
    const link = document.getElementById('migration-link');
    link.textContent = label;
    link.href = `https://www.iotalab.biz/cortex-remote/names/?lang=${language}`;
  };
  document.getElementById('language')?.addEventListener('change', () => queueMicrotask(render));
  if (document.readyState !== 'complete') document.addEventListener('DOMContentLoaded', render, { once: true });
  else render();
})();
