package com.murabha.cloud.job;

import com.murabha.cloud.entity.Installment;
import com.murabha.cloud.entity.FollowUp;
import com.murabha.cloud.repository.InstallmentRepository;
import com.murabha.cloud.repository.FollowUpRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class OverdueJob {

    private final InstallmentRepository installmentRepository;
    private final FollowUpRepository followUpRepository;

    @Scheduled(cron = "0 0 1 * * *") // Run daily at 1:00 AM
    @Transactional
    public void detectOverdueAndCreateFollowUps() {
        log.info("Starting scheduled job: Overdue installments detection");
        List<Installment> overdue = installmentRepository.findOverdueInstallments(null, LocalDate.now());
        
        int createdCount = 0;
        for (Installment inst : overdue) {
            // Check if a pending followup already exists for this customer
            List<FollowUp> pending = followUpRepository.findFollowUpsWithFilters(null, inst.getSale().getCustomerId(), false);
            if (pending.isEmpty()) {
                FollowUp followUp = FollowUp.builder()
                        .customerId(inst.getSale().getCustomerId())
                        .note("تم إنشاء متابعة تلقائية لوجود قسط متأخر رقم " + inst.getInstallmentNo() + " بقيمة " + inst.getAmount())
                        .logs("[]")
                        .nextFollowUp(LocalDate.now())
                        .isCompleted(false)
                        .branchId(inst.getBranchId())
                        .build();
                followUpRepository.save(followUp);
                createdCount++;
            }
        }
        log.info("Finished overdue detection job. Created {} follow-ups automatically.", createdCount);
    }
}
