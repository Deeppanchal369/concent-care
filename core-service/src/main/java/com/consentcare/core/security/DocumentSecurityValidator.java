package com.consentcare.core.security;

import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Set;

/**
 * Validates uploaded clinical documents against malicious payloads,
 * file-signature spoofing, and path traversal attacks.
 * 
 * Complies with:
 * - OWASP ASVS 5.0.0 V12.1.1: File upload signature verification
 * - OWASP ASVS 5.0.0 V12.1.2: Path traversal and filename sanitization
 * - OWASP ASVS 5.0.0 V12.1.3: Safe file size and extension allowlisting
 */
@Component
public class DocumentSecurityValidator {

    private static final long MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "pdf", "jpg", "jpeg", "png", "doc", "docx", "txt", "csv"
    );

    // Magic Byte Signatures
    private static final byte[] PDF_SIGNATURE = { 0x25, 0x50, 0x44, 0x46 }; // %PDF
    private static final byte[] PNG_SIGNATURE = { (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A };
    private static final byte[] JPEG_SIGNATURE = { (byte) 0xFF, (byte) 0xD8, (byte) 0xFF };
    private static final byte[] ZIP_DOCX_SIGNATURE = { 0x50, 0x4B, 0x03, 0x04 }; // PK.. (DOCX)
    private static final byte[] OLE_DOC_SIGNATURE = { (byte) 0xD0, (byte) 0xCF, 0x11, (byte) 0xE0, (byte) 0xA1, (byte) 0xB1, 0x1A, (byte) 0xE1 }; // Legacy DOC

    /**
     * Validates file presence, size, extension, and binary signature.
     */
    public void validateUpload(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Uploaded file cannot be empty.");
        }

        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("File exceeds maximum allowed upload size of 20 MB.");
        }

        String safeName = sanitizeFilename(file.getOriginalFilename());
        String extension = extractExtension(safeName);

        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("Unsupported file type: '" + extension + "'. Allowed formats: PDF, JPG, JPEG, PNG, DOC, DOCX, TXT, CSV.");
        }

        validateFileSignature(file, extension);
    }

    /**
     * Inspects the binary header (magic bytes) to ensure file content matches the declared extension.
     */
    public void validateFileSignature(MultipartFile file, String extension) {
        byte[] header = new byte[8];
        try (InputStream is = file.getInputStream()) {
            int read = is.read(header);
            if (read < 3 && !extension.equals("txt") && !extension.equals("csv")) {
                throw new IllegalArgumentException("Invalid file: binary stream is too short.");
            }

            switch (extension) {
                case "pdf":
                    if (!matchesPrefix(header, PDF_SIGNATURE)) {
                        throw new IllegalArgumentException("File content signature mismatch: expected valid PDF document.");
                    }
                    break;
                case "png":
                    if (!matchesPrefix(header, PNG_SIGNATURE)) {
                        throw new IllegalArgumentException("File content signature mismatch: expected valid PNG image.");
                    }
                    break;
                case "jpg":
                case "jpeg":
                    if (!matchesPrefix(header, JPEG_SIGNATURE)) {
                        throw new IllegalArgumentException("File content signature mismatch: expected valid JPEG image.");
                    }
                    break;
                case "docx":
                    if (!matchesPrefix(header, ZIP_DOCX_SIGNATURE)) {
                        throw new IllegalArgumentException("File content signature mismatch: expected valid DOCX document.");
                    }
                    break;
                case "doc":
                    if (!matchesPrefix(header, OLE_DOC_SIGNATURE) && !matchesPrefix(header, ZIP_DOCX_SIGNATURE)) {
                        throw new IllegalArgumentException("File content signature mismatch: expected valid DOC document.");
                    }
                    break;
                case "txt":
                case "csv":
                    validateTextContent(header, read);
                    break;
                default:
                    throw new IllegalArgumentException("Disallowed file extension: " + extension);
            }
        } catch (IOException e) {
            throw new IllegalArgumentException("Could not read uploaded file content for security validation: " + e.getMessage());
        }
    }

    private void validateTextContent(byte[] sample, int length) {
        for (int i = 0; i < length; i++) {
            byte b = sample[i];
            // Disallow null bytes and control chars (except tab, LF, CR)
            if (b == 0x00 || (b < 0x20 && b != 0x09 && b != 0x0A && b != 0x0D)) {
                throw new IllegalArgumentException("Binary content detected in plain text file.");
            }
        }
    }

    private boolean matchesPrefix(byte[] header, byte[] expectedPrefix) {
        if (header.length < expectedPrefix.length) {
            return false;
        }
        for (int i = 0; i < expectedPrefix.length; i++) {
            if (header[i] != expectedPrefix[i]) {
                return false;
            }
        }
        return true;
    }

    /**
     * Sanitizes file names against path traversal, control characters, and dangerous characters.
     */
    public String sanitizeFilename(String originalFilename) {
        if (originalFilename == null || originalFilename.isBlank()) {
            return "document.pdf";
        }

        // Strip path traversal sequences
        String cleanName = originalFilename.replace("\\", "/");
        int lastSlash = cleanName.lastIndexOf('/');
        if (lastSlash >= 0) {
            cleanName = cleanName.substring(lastSlash + 1);
        }

        // Remove any null bytes or control characters
        cleanName = cleanName.replaceAll("[\\p{Cntrl}\\u0000]", "");

        // Remove double dots to prevent directory traversal
        cleanName = cleanName.replaceAll("\\.{2,}", ".");

        // Keep safe characters: letters, digits, '.', '-', '_'
        cleanName = cleanName.replaceAll("[^a-zA-Z0-9.\\-_]", "_");

        // Trim and constrain length
        if (cleanName.length() > 120) {
            String ext = extractExtension(cleanName);
            cleanName = cleanName.substring(0, 110) + (ext.isEmpty() ? "" : "." + ext);
        }

        if (cleanName.isBlank() || cleanName.equals(".")) {
            return "document.pdf";
        }

        return cleanName;
    }

    public String extractExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "";
        }
        return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
    }
}
