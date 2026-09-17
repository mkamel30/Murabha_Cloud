package com.murabha.cloud.security;

import java.util.UUID;

public final class BranchContext {

    private static final ThreadLocal<UUID> CURRENT_BRANCH_ID = new ThreadLocal<>();

    private BranchContext() {}

    public static void setBranchId(UUID branchId) {
        CURRENT_BRANCH_ID.set(branchId);
    }

    public static UUID getBranchId() {
        return CURRENT_BRANCH_ID.get();
    }

    public static void clear() {
        CURRENT_BRANCH_ID.remove();
    }
}