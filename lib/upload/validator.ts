/**
 * QAYANI File Upload Validator
 * Validates file type, size, and content before upload
 */

import { Errors } from '../errors/types';

/**
 * File type constraints
 */
export const FILE_CONSTRAINTS = {
  audio: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: [
      'audio/mp3',
      'audio/mpeg',
      'audio/wav',
      'audio/m4a',
      'audio/ogg',
      'audio/webm',
    ],
    allowedExtensions: ['.mp3', '.wav', '.m4a', '.ogg', '.webm'],
  },
  image: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
    ],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
  },
  video: {
    maxSize: 100 * 1024 * 1024, // 100MB
    allowedTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
    allowedExtensions: ['.mp4', '.webm', '.mov'],
  },
  model3d: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: [
      'model/gltf-binary',
      'application/octet-stream', // GLB files
    ],
    allowedExtensions: ['.glb', '.gltf'],
  },
} as const;

export type FileType = keyof typeof FILE_CONSTRAINTS;

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  fileInfo?: {
    name: string;
    size: number;
    type: string;
    extension: string;
  };
}

/**
 * Validate file before upload
 * Checks type, size, extension, and content
 */
export async function validateFile(
  file: File,
  fileType: FileType
): Promise<ValidationResult> {
  const constraints = FILE_CONSTRAINTS[fileType];
  const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;

  // Check file extension
  if (!constraints.allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `Invalid file extension. Allowed: ${constraints.allowedExtensions.join(', ')}`,
    };
  }

  // Check file type (MIME type)
  if (!constraints.allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${constraints.allowedTypes.join(', ')}`,
    };
  }

  // Check file size
  if (file.size > constraints.maxSize) {
    const maxSizeMB = (constraints.maxSize / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File too large. Maximum size: ${maxSizeMB}MB`,
    };
  }

  // Validate file content (magic bytes)
  const isValidContent = await validateFileContent(file, fileType);
  if (!isValidContent) {
    return {
      valid: false,
      error: 'File content does not match expected format. The file may be corrupted or renamed.',
    };
  }

  return {
    valid: true,
    fileInfo: {
      name: file.name,
      size: file.size,
      type: file.type,
      extension,
    },
  };
}

/**
 * Validate file content using magic bytes (file signatures)
 * Prevents file extension spoofing
 */
async function validateFileContent(
  file: File,
  fileType: FileType
): Promise<boolean> {
  try {
    // Read first 12 bytes of file
    const buffer = await file.slice(0, 12).arrayBuffer();
    const header = new Uint8Array(buffer);

    switch (fileType) {
      case 'audio':
        return validateAudioContent(header);

      case 'image':
        return validateImageContent(header);

      case 'video':
        return validateVideoContent(header);

      case 'model3d':
        return validate3DModelContent(header);

      default:
        return false;
    }
  } catch (error) {
    console.error('File content validation error:', error);
    return false;
  }
}

/**
 * Validate audio file magic bytes
 */
function validateAudioContent(header: Uint8Array): boolean {
  // MP3: FF FB or FF F3 or FF F2 (MPEG Audio)
  if (header[0] === 0xFF && (header[1] & 0xE0) === 0xE0) {
    return true;
  }

  // MP3 with ID3: 49 44 33 (ID3)
  if (header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33) {
    return true;
  }

  // WAV: 52 49 46 46 (RIFF)
  if (
    header[0] === 0x52 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x46
  ) {
    return true;
  }

  // M4A/MP4 audio: 00 00 00 XX 66 74 79 70 (ftyp)
  if (
    header[4] === 0x66 &&
    header[5] === 0x74 &&
    header[6] === 0x79 &&
    header[7] === 0x70
  ) {
    return true;
  }

  // OGG: 4F 67 67 53 (OggS)
  if (
    header[0] === 0x4F &&
    header[1] === 0x67 &&
    header[2] === 0x67 &&
    header[3] === 0x53
  ) {
    return true;
  }

  return false;
}

/**
 * Validate image file magic bytes
 */
function validateImageContent(header: Uint8Array): boolean {
  // JPEG: FF D8 FF
  if (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) {
    return true;
  }

  // PNG: 89 50 4E 47
  if (
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4E &&
    header[3] === 0x47
  ) {
    return true;
  }

  // WebP: 52 49 46 46 ... 57 45 42 50 (RIFF...WEBP)
  if (
    header[0] === 0x52 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x46 &&
    header[8] === 0x57 &&
    header[9] === 0x45 &&
    header[10] === 0x42 &&
    header[11] === 0x50
  ) {
    return true;
  }

  // GIF: 47 49 46 38
  if (
    header[0] === 0x47 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x38
  ) {
    return true;
  }

  return false;
}

/**
 * Validate video file magic bytes
 */
function validateVideoContent(header: Uint8Array): boolean {
  // MP4: 00 00 00 XX 66 74 79 70 (ftyp)
  if (
    header[4] === 0x66 &&
    header[5] === 0x74 &&
    header[6] === 0x79 &&
    header[7] === 0x70
  ) {
    return true;
  }

  // WebM: 1A 45 DF A3
  if (
    header[0] === 0x1A &&
    header[1] === 0x45 &&
    header[2] === 0xDF &&
    header[3] === 0xA3
  ) {
    return true;
  }

  // QuickTime/MOV: Also starts with ftyp
  return (
    header[4] === 0x66 &&
    header[5] === 0x74 &&
    header[6] === 0x79 &&
    header[7] === 0x70
  );
}

/**
 * Validate 3D model file magic bytes
 */
function validate3DModelContent(header: Uint8Array): boolean {
  // GLB (Binary glTF): 67 6C 54 46 (glTF)
  if (
    header[0] === 0x67 &&
    header[1] === 0x6C &&
    header[2] === 0x54 &&
    header[3] === 0x46
  ) {
    return true;
  }

  // GLTF (JSON format): Check for opening brace
  if (header[0] === 0x7B) {
    // {
    return true;
  }

  return false;
}

/**
 * Throw error if validation fails
 * Helper function for use in API routes
 */
export function throwIfInvalid(result: ValidationResult): void {
  if (!result.valid) {
    throw Errors.validation(
      { fileValidation: result.error },
      result.error || 'File validation failed'
    );
  }
}

/**
 * Validate multiple files at once
 */
export async function validateFiles(
  files: File[],
  fileType: FileType
): Promise<ValidationResult[]> {
  return Promise.all(files.map((file) => validateFile(file, fileType)));
}

/**
 * Check if file is safe (no malicious content)
 * Placeholder for future virus scanning integration
 */
export async function scanForViruses(file: File): Promise<boolean> {
  // TODO: Integrate with virus scanning service
  // Options: ClamAV, VirusTotal API, AWS Macie
  return true;
}

/**
 * Generate safe filename
 * Removes special characters and adds timestamp
 */
export function generateSafeFilename(originalFilename: string): string {
  const timestamp = Date.now();
  const extension = originalFilename.split('.').pop()?.toLowerCase();
  const nameWithoutExt = originalFilename
    .substring(0, originalFilename.lastIndexOf('.'))
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .substring(0, 50);

  return `${timestamp}-${nameWithoutExt}.${extension}`;
}
