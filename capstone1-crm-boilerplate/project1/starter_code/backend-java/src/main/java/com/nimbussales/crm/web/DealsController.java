package com.nimbussales.crm.web;

import com.nimbussales.crm.domain.DealStage;
import com.nimbussales.crm.domain.DealStageRules;
import com.nimbussales.crm.service.DealService;
import com.nimbussales.crm.service.FieldValidationException;
import com.nimbussales.crm.web.dto.DealCreateRequest;
import com.nimbussales.crm.web.dto.DealHistoryResponse;
import com.nimbussales.crm.web.dto.DealResponse;
import com.nimbussales.crm.web.dto.DealStageRequest;
import com.nimbussales.crm.web.dto.DealSummaryResponse;
import com.nimbussales.crm.web.dto.DealUpdateRequest;
import com.nimbussales.crm.web.dto.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/deals")
@Tag(name = "Deals")
public class DealsController {

    private final DealService dealService;

    public DealsController(DealService dealService) {
        this.dealService = dealService;
    }

    @GetMapping
    @Operation(summary = "One page of deals, soonest expected close first")
    public PageResponse<DealResponse> list(@RequestParam(defaultValue = "0") int page,
                                           @RequestParam(defaultValue = "20") int size,
                                           @RequestParam(required = false) String stage) {
        DealStage filter = stage == null || stage.isBlank() ? null : parseStage(stage);
        return PageResponse.from(dealService.list(page, size, filter), DealResponse::from);
    }

    @GetMapping("/summary")
    @Operation(summary = "What the pipeline is worth: count and value per stage, plus the open total")
    public DealSummaryResponse summary() {
        return DealSummaryResponse.from(dealService.summarise());
    }

    @GetMapping("/{dealRef}")
    @Operation(summary = "One deal")
    public DealResponse get(@PathVariable String dealRef) {
        return DealResponse.from(dealService.getByRef(dealRef));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a deal for an account and one of its contacts (ADMIN)")
    public DealResponse create(@Valid @RequestBody DealCreateRequest request) {
        return DealResponse.from(dealService.create(request.title(), request.accountRef(), request.contactRef(),
                request.value(), request.expectedCloseDate(), request.ownerRef()));
    }

    @PutMapping("/{dealRef}")
    @Operation(summary = "Edit a deal's title, value, expected close date and owner (ADMIN)")
    public DealResponse update(@PathVariable String dealRef, @Valid @RequestBody DealUpdateRequest request) {
        return DealResponse.from(dealService.update(dealRef, request.title(), request.value(),
                request.expectedCloseDate(), request.ownerRef()));
    }

    @DeleteMapping("/{dealRef}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete a deal. Only a PROSPECTING deal can be deleted (ADMIN)")
    public void delete(@PathVariable String dealRef) {
        dealService.delete(dealRef);
    }

    @PostMapping("/{dealRef}/stage")
    @Operation(summary = "Move a deal to another stage")
    public DealResponse moveToStage(@PathVariable String dealRef, @Valid @RequestBody DealStageRequest request) {
        return DealResponse.from(dealService.moveToStage(dealRef, parseStage(request.stage()),
                request.closeDate(), request.lostReason()));
    }

    @GetMapping("/{dealRef}/history")
    @Operation(summary = "Every move of this deal, oldest first")
    public List<DealHistoryResponse> history(@PathVariable String dealRef) {
        return dealService.history(dealRef).stream().map(DealHistoryResponse::from).toList();
    }

    /**
     * A stage name nobody recognises is a bad request, not a 500: the service never sees it,
     * and the answer names the property in the house shape.
     */
    private static DealStage parseStage(String stage) {
        return DealStageRules.parse(stage).orElseThrow(() -> new FieldValidationException("stage",
                "stage must be one of PROSPECTING, QUALIFIED, PROPOSAL, NEGOTIATION, WON, LOST"));
    }
}
