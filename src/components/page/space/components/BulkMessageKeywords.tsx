import { cn } from '@/lib/utils';
import { Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'bulk-coin-message-keywords';

interface BulkMessageKeywordsProps {
  onPick: (keyword: string) => void;
}

// 자주 쓰는 메시지 키워드를 웹 localStorage에 저장해두고, 클릭으로 메시지에 입력한다.
function BulkMessageKeywords({ onPick }: BulkMessageKeywordsProps) {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setKeywords(JSON.parse(raw));
    } catch {
      // 손상된 값은 무시하고 빈 목록으로 시작
    }
  }, []);

  const persist = (next: string[]) => {
    setKeywords(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // 저장 실패(용량/프라이빗 모드)는 무시 — 세션 내에서는 동작
    }
  };

  const commitDraft = () => {
    const word = draft.trim();
    setDraft('');
    setAdding(false);
    if (!word || keywords.includes(word)) return;
    persist([...keywords, word]);
  };

  const remove = (word: string) => persist(keywords.filter((k) => k !== word));

  const chipBase =
    'inline-flex items-center rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-600';

  return (
    <div className='flex flex-wrap items-center gap-1.5'>
      {keywords.map((keyword) => (
        <span key={keyword} className={cn(chipBase, 'py-1 pl-3 pr-1')}>
          <button
            type='button'
            onClick={() => onPick(keyword)}
            className='transition-colors hover:text-slate-900'
            title='메시지에 입력'
          >
            {keyword}
          </button>
          <button
            type='button'
            aria-label={`${keyword} 키워드 삭제`}
            onClick={() => remove(keyword)}
            className='ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700'
          >
            <X className='h-3 w-3' />
          </button>
        </span>
      ))}

      {adding ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitDraft();
            } else if (e.key === 'Escape') {
              setDraft('');
              setAdding(false);
            }
          }}
          onBlur={commitDraft}
          placeholder='키워드 입력 후 Enter'
          className='h-7 w-40 rounded-full border border-slate-300 px-3 text-xs outline-none focus:border-slate-400'
        />
      ) : (
        <button
          type='button'
          onClick={() => setAdding(true)}
          className={cn(chipBase, 'gap-1 border-dashed py-1 pl-2 pr-3 text-slate-500 hover:text-slate-700')}
        >
          <Plus className='h-3 w-3' />
          키워드 등록
        </button>
      )}
    </div>
  );
}

export default BulkMessageKeywords;
