"use client";

import React from "react";
import { EditProvider, useEdit } from "./contexts/EditExperimentContext";
import ExperimentEditModal from "./components/ExperimentEditModal";
import { FeedbackSheetProvider } from "./contexts/FeedbackSheetContext";
import FeedbackBottomSheet from "./components/FeedbackBottomSheet";
import { LoginModalProvider } from "./contexts/LoginModalContext";
import LoginModal from "./components/LoginModal";

function EditPortal() {
  const { editId, closeEdit } = useEdit();
  return (
    <ExperimentEditModal
      open={!!editId}
      postId={editId}
      currentUserId={null}
      onClose={closeEdit}
    />
  );
}

export default function EditProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LoginModalProvider>
      <EditProvider>
        <FeedbackSheetProvider>
          {children}
          <EditPortal />
          <FeedbackBottomSheet />
          <LoginModal />
        </FeedbackSheetProvider>
      </EditProvider>
    </LoginModalProvider>
  );
}
