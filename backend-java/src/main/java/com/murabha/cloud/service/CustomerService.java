package com.murabha.cloud.service;

import com.murabha.cloud.dto.CustomerDto;
import com.murabha.cloud.entity.Customer;
import com.murabha.cloud.exception.BadRequestException;
import com.murabha.cloud.exception.ResourceNotFoundException;
import com.murabha.cloud.repository.CustomerRepository;
import com.murabha.cloud.repository.MachineSaleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final MachineSaleRepository saleRepository;

    @Transactional(readOnly = true)
    public List<CustomerDto> getAll(String search, UUID branchId) {
        return customerRepository.searchCustomers(branchId, search).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Customer getById(UUID id) {
        return customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("العميل غير موجود"));
    }

    @Transactional
    public CustomerDto create(CustomerDto dto, UUID branchId) {
        String type = dto.getCustomerType() != null ? dto.getCustomerType() : "عام";
        if (customerRepository.existsByBkCodeAndCustomerType(dto.getBkCode(), type)) {
            throw new BadRequestException("كود العميل مستخدم بالفعل لنفس نوع العميل");
        }

        Customer customer = Customer.builder()
                .bkCode(dto.getBkCode())
                .customerType(type)
                .name(dto.getName())
                .phone(dto.getPhone())
                .address(dto.getAddress())
                .notes(dto.getNotes())
                .department(dto.getDepartment())
                .branchId(branchId != null ? branchId : dto.getBranchId())
                .build();

        return toDto(customerRepository.save(customer));
    }

    @Transactional
    public CustomerDto update(UUID id, CustomerDto dto) {
        Customer customer = getById(id);

        if (dto.getBkCode() != null && dto.getCustomerType() != null) {
            if (!dto.getBkCode().equals(customer.getBkCode()) || !dto.getCustomerType().equals(customer.getCustomerType())) {
                if (customerRepository.existsByBkCodeAndCustomerType(dto.getBkCode(), dto.getCustomerType())) {
                    throw new BadRequestException("كود العميل مستخدم بالفعل لنفس نوع العميل");
                }
                customer.setBkCode(dto.getBkCode());
                customer.setCustomerType(dto.getCustomerType());
            }
        }

        if (dto.getName() != null) customer.setName(dto.getName());
        if (dto.getPhone() != null) customer.setPhone(dto.getPhone());
        if (dto.getAddress() != null) customer.setAddress(dto.getAddress());
        if (dto.getNotes() != null) customer.setNotes(dto.getNotes());
        if (dto.getDepartment() != null) customer.setDepartment(dto.getDepartment());

        return toDto(customerRepository.save(customer));
    }

    @Transactional
    public void delete(UUID id) {
        Customer customer = getById(id);
        boolean hasActiveSales = saleRepository.findByCustomerIdOrderBySaleDateDesc(id).stream()
                .anyMatch(s -> !"VOIDED".equalsIgnoreCase(s.getStatus()));
        if (hasActiveSales) {
            throw new BadRequestException("لا يمكن حذف العميل لوجود عقود مبيعات نشطة مسجلة له");
        }
        customerRepository.delete(customer);
    }

    @Transactional(readOnly = true)
    public long getCount(UUID branchId) {
        if (branchId != null) {
            return customerRepository.countByBranchId(branchId);
        }
        return customerRepository.count();
    }

    @Transactional(readOnly = true)
    public String generateBkCode() {
        String maxCode = customerRepository.findMaxBkCode();
        if (maxCode != null && maxCode.startsWith("BK-")) {
            try {
                int num = Integer.parseInt(maxCode.substring(3));
                return String.format("BK-%05d", num + 1);
            } catch (NumberFormatException ignored) {}
        }
        long count = customerRepository.count();
        return String.format("BK-%05d", count + 1);
    }

    public CustomerDto toDto(Customer customer) {
        return CustomerDto.builder()
                .id(customer.getId())
                .bkCode(customer.getBkCode())
                .customerType(customer.getCustomerType())
                .name(customer.getName())
                .phone(customer.getPhone())
                .address(customer.getAddress())
                .notes(customer.getNotes())
                .department(customer.getDepartment())
                .branchId(customer.getBranchId())
                .createdAt(customer.getCreatedAt())
                .updatedAt(customer.getUpdatedAt())
                .sales(customer.getSales() != null ?
                        customer.getSales().stream()
                                .map(s -> CustomerDto.SaleSummaryDto.builder().id(s.getId()).build())
                                .collect(Collectors.toList()) : List.of())
                .build();
    }
}