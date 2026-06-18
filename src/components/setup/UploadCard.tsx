"use client";

import { useRef, useState } from "react";

import { SetupCard } from "@/components/setup/ui";

type UploadCardProps = {
  onFilesSelected: (files: File[]) => void;
  isProcessing: boolean;
  onClearAll: () => void;
  canClear: boolean;
  disabled?: boolean;
  disabledReason?: string;
};

export function UploadCard({
  onFilesSelected,
  isProcessing,
  onClearAll,
  canClear,
  disabled = false,
  disabledReason,
}: UploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0 || disabled) return;
    onFilesSelected(Array.from(fileList));
  }

  return (
    <SetupCard
      title="Upload resumes"
      description="Files are parsed in your browser. Original DOCX files are stored in private Supabase Storage when you are signed in."
    >
      {disabled && disabledReason ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {disabledReason}
        </p>
      ) : null}

      <div
        className={`mt-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 transition-colors ${
          dragActive
            ? "border-zinc-900 bg-zinc-100"
            : "border-zinc-300 bg-zinc-50"
        } ${disabled ? "opacity-50" : ""}`}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragActive(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          handleFiles(event.dataTransfer.files);
        }}
      >
        <p className="text-sm font-medium text-zinc-800">
          Drag and drop resume files here
        </p>
        <p className="mt-1 text-sm text-zinc-500">Supported format: .docx</p>
        <button
          type="button"
          disabled={isProcessing || disabled}
          onClick={() => inputRef.current?.click()}
          className="mt-5 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isProcessing ? "Processing…" : "Upload DOCX files"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          multiple
          className="hidden"
          onChange={(event) => {
            handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onClearAll}
          disabled={!canClear || disabled}
          className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Clear resume inventory
        </button>
      </div>
    </SetupCard>
  );
}
