import React, { useState, useRef } from 'react';
import { WixossCard, WixossDeck } from '../types/wixoss';
import { MatchRecord } from '../types/history';
import {
  downloadFullBackup,
  downloadDecksBackup,
  downloadCardsBackup,
  parseAndValidateBackup,
  WixossBackupData,
} from '../utils/backupUtils';
import {
  Download,
  Upload,
  Database,
  Layers,
  BookOpen,
  History,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  FileText,
  ShieldAlert,
} from 'lucide-react';

interface BackupSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: WixossCard[];
  decks: WixossDeck[];
  matchHistory: MatchRecord[];
  onRestoreBackup: (
    importedCards: WixossCard[],
    importedDecks: WixossDeck[],
    importedHistory?: MatchRecord[],
    mode?: 'merge' | 'replace'
  ) => void;
}

export const BackupSettingsModal: React.FC<BackupSettingsModalProps> = ({
  isOpen,
  onClose,
  cards,
  decks,
  matchHistory,
  onRestoreBackup,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [previewBackup, setPreviewBackup] = useState<WixossBackupData | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');

  if (!isOpen) return null;

  const customCardsCount = cards.filter((c) => c.isCustom).length;
  const customDecksCount = decks.filter((d) => d.id.startsWith('deck-')).length;

  const handleBackupAll = () => {
    downloadFullBackup(cards, decks, matchHistory);
    setToastMessage({
      type: 'success',
      text: 'Backup downloaded! Includes card database, deck data, and match history.',
    });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleBackupDecks = () => {
    downloadDecksBackup(decks, cards);
    setToastMessage({
      type: 'success',
      text: 'Exported Saved Decks to "Saved Decks - WO.json".',
    });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleBackupCards = () => {
    downloadCardsBackup(cards);
    setToastMessage({
      type: 'success',
      text: 'Exported Card Database to "wixoss_card_database.json".',
    });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const result = parseAndValidateBackup(content);
      if (result.success && result.data) {
        setPreviewBackup(result.data);
        setToastMessage({
          type: 'success',
          text: result.message,
        });
      } else {
        setPreviewBackup(null);
        setToastMessage({
          type: 'error',
          text: result.message,
        });
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const handleConfirmRestore = () => {
    if (!previewBackup) return;

    onRestoreBackup(
      previewBackup.cards,
      previewBackup.decks,
      previewBackup.matchHistory,
      importMode
    );

    setToastMessage({
      type: 'success',
      text: `Backup restored! ${previewBackup.cardCount} cards & ${previewBackup.deckCount} decks loaded (${importMode} mode).`,
    });

    setPreviewBackup(null);
    setTimeout(() => {
      setToastMessage(null);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/90">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white shadow-md">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">
                Backup & Data Management
              </h3>
              <p className="text-xs text-zinc-400">
                Export and import your entire card database & deck configurations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          {/* Toast Notification */}
          {toastMessage && (
            <div
              className={`p-3.5 rounded-xl border flex items-center gap-2.5 ${
                toastMessage.type === 'success'
                  ? 'bg-emerald-950/80 border-emerald-700/80 text-emerald-300'
                  : 'bg-rose-950/80 border-rose-700/80 text-rose-300'
              }`}
            >
              {toastMessage.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0" />
              )}
              <span className="font-medium text-xs">{toastMessage.text}</span>
            </div>
          )}

          {/* Current Local Storage Statistics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-1">
              <div className="flex items-center justify-between text-zinc-400 font-semibold">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <BookOpen className="h-3.5 w-3.5 text-rose-400" /> Total Cards
                </span>
                <span className="text-white font-mono font-bold text-sm">
                  {cards.length}
                </span>
              </div>
              <p className="text-[10px] text-zinc-500">
                {customCardsCount} Custom • {cards.length - customCardsCount} Standard
              </p>
            </div>

            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-1">
              <div className="flex items-center justify-between text-zinc-400 font-semibold">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <Layers className="h-3.5 w-3.5 text-sky-400" /> Saved Decks
                </span>
                <span className="text-white font-mono font-bold text-sm">
                  {decks.length}
                </span>
              </div>
              <p className="text-[10px] text-zinc-500">
                {customDecksCount} Custom • {decks.length - customDecksCount} Prebuilt
              </p>
            </div>

            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-1">
              <div className="flex items-center justify-between text-zinc-400 font-semibold">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <History className="h-3.5 w-3.5 text-amber-400" /> Match Records
                </span>
                <span className="text-white font-mono font-bold text-sm">
                  {matchHistory.length}
                </span>
              </div>
              <p className="text-[10px] text-zinc-500">Recorded Battle logs</p>
            </div>
          </div>

          {/* Export Actions Section */}
          <div className="bg-gradient-to-r from-zinc-950 to-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div>
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <Download className="h-4 w-4 text-emerald-400" /> Export Backups & JSON Data
              </h4>
              <p className="text-zinc-400 text-xs mt-0.5">
                Download your card database, custom deck creations, or complete system backup.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={handleBackupAll}
                className="px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-bold text-xs shadow-md flex flex-col items-start gap-1 transition-all"
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <Download className="h-4 w-4 shrink-0" /> Backup All (.json)
                </div>
                <span className="text-[10px] text-emerald-100/80 font-normal">
                  Cards + Decks + Matches
                </span>
              </button>

              <button
                onClick={handleBackupDecks}
                className="px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-100 font-bold text-xs flex flex-col items-start gap-1 transition-all"
              >
                <div className="flex items-center gap-1.5 font-bold text-sky-400">
                  <Layers className="h-4 w-4 shrink-0" /> Saved Decks - WO.json
                </div>
                <span className="text-[10px] text-zinc-400 font-normal">
                  Exports saved decks only
                </span>
              </button>

              <button
                onClick={handleBackupCards}
                className="px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-100 font-bold text-xs flex flex-col items-start gap-1 transition-all"
              >
                <div className="flex items-center gap-1.5 font-bold text-amber-400">
                  <BookOpen className="h-4 w-4 shrink-0" /> Card Database (.json)
                </div>
                <span className="text-[10px] text-zinc-400 font-normal">
                  Exports card library only
                </span>
              </button>
            </div>
          </div>

          {/* Import / Restore Backup Section */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div>
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <Upload className="h-4 w-4 text-sky-400" /> Restore / Import Backup
              </h4>
              <p className="text-zinc-400 text-xs mt-0.5">
                Load a previously exported <code className="text-amber-300 font-mono">.json</code> backup file to restore your card library and saved decks.
              </p>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-200 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <FileText className="h-4 w-4 text-sky-400" /> Select Backup JSON File
              </button>

              <span className="text-[11px] text-zinc-500">
                Accepts JSON files generated by 'Backup All'
              </span>
            </div>

            {/* Preview of selected backup file */}
            {previewBackup && (
              <div className="p-4 rounded-xl bg-zinc-900 border border-sky-800/60 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="font-bold text-sky-300 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" /> Valid Backup Loaded
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    Exported: {new Date(previewBackup.exportDate).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                    <span className="text-zinc-400 font-semibold block text-[10px]">
                      Cards in File
                    </span>
                    <span className="text-white font-bold font-mono text-sm">
                      {previewBackup.cards?.length || 0}
                    </span>
                  </div>
                  <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                    <span className="text-zinc-400 font-semibold block text-[10px]">
                      Decks in File
                    </span>
                    <span className="text-white font-bold font-mono text-sm">
                      {previewBackup.decks?.length || 0}
                    </span>
                  </div>
                </div>

                {/* Import Mode Selection */}
                <div className="space-y-1.5 pt-1">
                  <label className="block text-zinc-400 font-semibold text-[10px] uppercase tracking-wider">
                    Import Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setImportMode('merge')}
                      className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                        importMode === 'merge'
                          ? 'border-sky-500 bg-sky-950/40 text-sky-300 font-bold'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                      }`}
                    >
                      <div className="font-bold text-white">Merge & Update</div>
                      <div className="text-[10px] text-zinc-500">
                        Combine with existing cards & decks
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setImportMode('replace')}
                      className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                        importMode === 'replace'
                          ? 'border-amber-500 bg-amber-950/40 text-amber-300 font-bold'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                      }`}
                    >
                      <div className="font-bold text-white">Replace All</div>
                      <div className="text-[10px] text-zinc-500">
                        Overwrite current card database & decks
                      </div>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    onClick={() => setPreviewBackup(null)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmRestore}
                    className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow"
                  >
                    Confirm & Restore Backup
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/90 flex items-center justify-between">
          <span className="text-[11px] text-zinc-500 flex items-center gap-1">
            <ShieldAlert className="h-3.5 w-3.5 text-zinc-400" /> Data is saved locally in your browser cache.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
