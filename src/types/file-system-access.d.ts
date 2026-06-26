// Minimal ambient declarations for the File System Access API.
//
// TypeScript's stock `lib.dom.d.ts` (5.7) already ships FileSystemFileHandle and
// FileSystemWritableFileStream, but NOT the `window.show{Open,Save}FilePicker`
// entry points or the Chromium permission methods. We hand-roll just those bits
// (all optional) instead of pulling in `@types/wicg-file-system-access`, so the
// dependency surface stays tiny and capability checks at runtime still gate use.

export {};

declare global {
  interface FileSystemHandlePermissionDescriptor {
    mode?: 'read' | 'readwrite';
  }

  interface FileSystemHandle {
    queryPermission?(
      descriptor?: FileSystemHandlePermissionDescriptor,
    ): Promise<PermissionState>;
    requestPermission?(
      descriptor?: FileSystemHandlePermissionDescriptor,
    ): Promise<PermissionState>;
  }

  interface FilePickerAcceptType {
    description?: string;
    accept: Record<string, string | string[]>;
  }

  interface OpenFilePickerOptions {
    multiple?: boolean;
    excludeAcceptAllOption?: boolean;
    types?: FilePickerAcceptType[];
  }

  interface SaveFilePickerOptions {
    excludeAcceptAllOption?: boolean;
    suggestedName?: string;
    types?: FilePickerAcceptType[];
  }

  interface Window {
    showOpenFilePicker?(
      options?: OpenFilePickerOptions,
    ): Promise<FileSystemFileHandle[]>;
    showSaveFilePicker?(
      options?: SaveFilePickerOptions,
    ): Promise<FileSystemFileHandle>;
  }
}
