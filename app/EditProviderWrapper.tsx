"use client";

import React from "react";
import { EditProvider, useEdit } from "./contexts/EditExperimentContext";
import ExperimentEditModal from "./components/ExperimentEditModal";
import { FeedbackSheetProvider } from "./contexts/FeedbackSheetContext";
import FeedbackBottomSheet from "./components/FeedbackBottomSheet";

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
    <EditProvider>
      <FeedbackSheetProvider>
        {children}
        <EditPortal />
        <FeedbackBottomSheet />
      </FeedbackSheetProvider>
    </EditProvider>
  );
}
