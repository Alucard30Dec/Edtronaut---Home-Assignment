import Editor from '@monaco-editor/react';
import { Keyboard, Save } from 'lucide-react';

import type { AutosaveState } from '@/hooks/useDebouncedAutosave';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

type CodeEditorPanelProps = {
  code: string;
  language: 'python';
  autosaveState: AutosaveState;
  onCodeChange: (value: string) => void;
  onLanguageChange: (value: 'python') => void;
};

function autosaveLabel(state: AutosaveState) {
  if (state === 'saving') return 'Saving draft...';
  if (state === 'saved') return 'Draft saved';
  if (state === 'error') return 'Autosave error';
  return 'Editor ready';
}

export function CodeEditorPanel({
  code,
  language,
  autosaveState,
  onCodeChange,
  onLanguageChange,
}: CodeEditorPanelProps) {
  return (
    <Card className='flex min-h-[380px] flex-col'>
      <CardHeader className='pb-4'>
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <CardTitle>Coding Workspace</CardTitle>
          <div className='flex items-center gap-3'>
            <div className='w-32'>
              <Select value={language} onValueChange={(value) => onLanguageChange(value as 'python')}>
                <SelectTrigger aria-label='Programming language'>
                  <SelectValue placeholder='Language' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='python'>Python (MVP)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='flex items-center gap-2 text-xs text-muted-foreground'>
              <Keyboard className='h-3.5 w-3.5' />
              Ctrl/Cmd + Enter to run
            </div>
          </div>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className='flex flex-1 flex-col gap-3 pt-4'>
        <div className='flex items-center gap-2 text-xs text-muted-foreground'>
          <Save className='h-3.5 w-3.5' />
          {autosaveLabel(autosaveState)}
        </div>
        <div className='min-h-[300px] flex-1 overflow-hidden rounded-xl border'>
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
