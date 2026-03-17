import Editor from '@monaco-editor/react';
import { AlertCircle, Keyboard, Loader2 } from 'lucide-react';

import type { AutosaveState } from '@/hooks/useDebouncedAutosave';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/lib/language';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type CodeEditorPanelProps = {
  code: string;
  language: 'python';
  autosaveState: AutosaveState;
  onCodeChange: (value: string) => void;
  onLanguageChange: (value: 'python') => void;
};

function autosaveLabel(
  state: AutosaveState,
  labels: { editorSaving: string; editorSaved: string; editorError: string; editorReady: string },
) {
  if (state === 'saving') return labels.editorSaving;
  if (state === 'error') return labels.editorError;
  return null;
}

export function CodeEditorPanel({
  code,
  language,
  autosaveState,
  onCodeChange,
  onLanguageChange,
}: CodeEditorPanelProps) {
  const { t } = useLanguage();
  const autosaveText = autosaveLabel(autosaveState, t.autosave);

  return (
    <Card className='overflow-hidden border bg-card shadow-panel'>
      <CardHeader className='border-b bg-muted/20 py-3'>
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <CardTitle>{t.editor.title}</CardTitle>
          <div className='flex items-center gap-3'>
            <div className='w-32'>
              <Select value={language} onValueChange={(value) => onLanguageChange(value as 'python')}>
                <SelectTrigger aria-label={t.editor.languageAria}>
                  <SelectValue placeholder={t.editor.languagePlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='python'>{t.editor.pythonMvp}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='rounded-lg border bg-background/70 px-2 py-1 text-xs text-muted-foreground'>
              <Keyboard className='h-3.5 w-3.5' />
              <span className='ml-1'>{t.editor.shortcutHint}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className='space-y-2 p-3'>
        {autosaveText ? (
          <div
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${
              autosaveState === 'error'
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-amber-200 bg-amber-50 text-amber-700'
            }`}
          >
            {autosaveState === 'error' ? (
              <AlertCircle className='h-3.5 w-3.5' />
            ) : (
              <Loader2 className='h-3.5 w-3.5 animate-spin' />
            )}
            {autosaveText}
          </div>
        ) : null}

        <div className='h-[460px] overflow-hidden rounded-xl border'>
          <Editor
            height='100%'
            defaultLanguage='python'
            language={language}
            value={code}
            onChange={(value) => onCodeChange(value ?? '')}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineHeight: 22,
              readOnly: false,
              automaticLayout: true,
              scrollBeyondLastLine: false,
              renderLineHighlight: 'gutter',
              padding: { top: 16, bottom: 16 },
              smoothScrolling: true,
            }}
            theme='vs'
          />
        </div>
      </CardContent>
    </Card>
  );
}
