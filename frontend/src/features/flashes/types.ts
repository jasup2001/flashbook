export interface Flash {
  id: string;
  file: string;
  number: string;
  width: number;
  height: number;
  original: string;
  bytes: number;
  sha256: string;
  thumbnails: { width: number; src: string; bytes: number }[];
}
