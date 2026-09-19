package com.consentcare.core.controller;

import com.consentcare.core.dto.DocumentDtos.*;
import com.consentcare.core.dto.PageResponse;
import com.consentcare.core.model.Document;
import com.consentcare.core.model.DocumentCategory;
import com.consentcare.core.model.User;
import com.consentcare.core.service.DocumentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DocumentResponse> upload(
            @RequestParam("patientId") Long patientId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "title", required = false) String title,
            @RequestParam(value = "category", required = false) DocumentCategory category,
            @RequestParam(value = "description", required = false) String description,
            @AuthenticationPrincipal User uploader) {
        return ResponseEntity.ok(documentService.upload(patientId, uploader, file, category, title, description));
    }

    @GetMapping("/patient/{patientId}")
    @PreAuthorize("@consentSecurityEvaluator.canAccessPatient(authentication, #patientId, 'DOCUMENTS')")
    public ResponseEntity<List<DocumentResponse>> listForPatient(
            @PathVariable Long patientId,
            @AuthenticationPrincipal User actor) {
        return ResponseEntity.ok(documentService.listForPatient(patientId, actor));
    }

    @GetMapping("/patient/{patientId}/paged")
    @PreAuthorize("@consentSecurityEvaluator.canAccessPatient(authentication, #patientId, 'DOCUMENTS')")
    public ResponseEntity<PageResponse<DocumentResponse>> listPagedForPatient(
            @PathVariable Long patientId,
            @RequestParam(value = "category", required = false) DocumentCategory category,
            @RequestParam(value = "search", required = false) String search,
            @PageableDefault(size = 10, sort = "uploadedAt", direction = Sort.Direction.DESC) Pageable pageable,
            @AuthenticationPrincipal User actor) {
        return ResponseEntity.ok(documentService.listPagedForPatient(patientId, category, search, pageable, actor));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DocumentDetailResponse> getDocumentDetail(
            @PathVariable Long id,
            @AuthenticationPrincipal User actor) {
        return ResponseEntity.ok(documentService.getDocumentDetail(id, actor));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<DocumentResponse> updateDocument(
            @PathVariable Long id,
            @Valid @RequestBody UpdateDocumentRequest req,
            @AuthenticationPrincipal User actor) {
        return ResponseEntity.ok(documentService.updateDocument(id, req, actor));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> archiveDocument(
            @PathVariable Long id,
            @AuthenticationPrincipal User actor) {
        documentService.archiveDocument(id, actor);
        return ResponseEntity.ok(Map.of("message", "Document archived successfully"));
    }

    @PostMapping("/{id}/share")
    public ResponseEntity<DocumentResponse> shareDocument(
            @PathVariable Long id,
            @Valid @RequestBody ShareDocumentRequest req,
            @AuthenticationPrincipal User actor) {
        return ResponseEntity.ok(documentService.shareDocument(id, req.doctorId(), actor));
    }

    @DeleteMapping("/{id}/share/{doctorId}")
    public ResponseEntity<DocumentResponse> revokeShare(
            @PathVariable Long id,
            @PathVariable Long doctorId,
            @AuthenticationPrincipal User actor) {
        return ResponseEntity.ok(documentService.revokeDocumentShare(id, doctorId, actor));
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> download(
            @PathVariable Long id,
            @AuthenticationPrincipal User actor) {
        Document doc = documentService.getMetaForDownload(id, actor);
        Resource resource = documentService.loadAsResource(doc);
        MediaType mediaType = doc.getContentType() != null
                ? MediaType.parseMediaType(doc.getContentType())
                : MediaType.APPLICATION_OCTET_STREAM;

        String safeFileName = (doc.getOriginalFilename() != null && !doc.getOriginalFilename().isBlank())
                ? doc.getOriginalFilename()
                : doc.getFileName();

        org.springframework.http.ContentDisposition disposition = org.springframework.http.ContentDisposition.attachment()
                .filename(safeFileName, java.nio.charset.StandardCharsets.UTF_8)
                .build();

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .header("X-Content-Type-Options", "nosniff")
                .body(resource);
    }

    @GetMapping("/{id}/preview")
    public ResponseEntity<Resource> preview(
            @PathVariable Long id,
            @AuthenticationPrincipal User actor) {
        Document doc = documentService.getMetaForDownload(id, actor);
        Resource resource = documentService.loadAsResource(doc);
        MediaType mediaType = doc.getContentType() != null
                ? MediaType.parseMediaType(doc.getContentType())
                : MediaType.APPLICATION_OCTET_STREAM;

        String safeFileName = (doc.getOriginalFilename() != null && !doc.getOriginalFilename().isBlank())
                ? doc.getOriginalFilename()
                : doc.getFileName();

        org.springframework.http.ContentDisposition disposition = org.springframework.http.ContentDisposition.inline()
                .filename(safeFileName, java.nio.charset.StandardCharsets.UTF_8)
                .build();

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .header("X-Content-Type-Options", "nosniff")
                .header("Content-Security-Policy", "default-src 'self'")
                .body(resource);
    }
}
