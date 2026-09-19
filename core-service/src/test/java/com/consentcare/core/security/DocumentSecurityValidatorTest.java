package com.consentcare.core.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import static org.junit.jupiter.api.Assertions.*;

class DocumentSecurityValidatorTest {

    private DocumentSecurityValidator validator;

    @BeforeEach
    void setUp() {
        validator = new DocumentSecurityValidator();
    }

    @Test
    void testValidPdfAccepted() {
        byte[] pdfContent = "%PDF-1.7 valid dummy content".getBytes();
        MockMultipartFile file = new MockMultipartFile("file", "lab_report.pdf", "application/pdf", pdfContent);

        assertDoesNotThrow(() -> validator.validateUpload(file));
    }

    @Test
    void testFakePdfWithExecutableContentRejected() {
        // MZ header indicating Windows PE / EXE disguised as PDF
        byte[] exeContent = new byte[] { 'M', 'Z', 0x00, 0x01, 0x02, 0x03, 0x04, 0x05 };
        MockMultipartFile file = new MockMultipartFile("file", "malware.pdf", "application/pdf", exeContent);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> validator.validateUpload(file));
        assertTrue(ex.getMessage().contains("signature mismatch"), "Must reject signature mismatch");
    }

    @Test
    void testDisallowedExtensionRejected() {
        byte[] scriptContent = "<script>alert(1)</script>".getBytes();
        MockMultipartFile file = new MockMultipartFile("file", "exploit.html", "text/html", scriptContent);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> validator.validateUpload(file));
        assertTrue(ex.getMessage().contains("Unsupported file type"), "Must reject disallowed extension");
    }

    @Test
    void testFilenameSanitizationStripsPathTraversal() {
        String unsafe = "../../sensitive/../../etc/passwd.pdf";
        String clean = validator.sanitizeFilename(unsafe);

        assertFalse(clean.contains(".."), "Cleaned filename must not contain directory traversal");
        assertFalse(clean.contains("/"), "Cleaned filename must not contain forward slashes");
        assertFalse(clean.contains("\\"), "Cleaned filename must not contain backslashes");
        assertTrue(clean.endsWith(".pdf"), "Extension must be preserved");
    }

    @Test
    void testFilenameSanitizationRemovesControlCharacters() {
        String dangerous = "test\u0000\u0008\u001freport\r\n.pdf";
        String clean = validator.sanitizeFilename(dangerous);

        assertFalse(clean.contains("\u0000"), "Null bytes must be stripped");
        assertFalse(clean.contains("\r"), "CR must be stripped");
        assertFalse(clean.contains("\n"), "LF must be stripped");
    }
}

