"use client";

import { useParams } from "next/navigation";
import ProfilePage from "../components/ProfilePage";

export default function ProfileByIdPage() {
  const params = useParams<{ id: string }>();
  return <ProfilePage routeProfileId={params?.id ?? null} />;
}
