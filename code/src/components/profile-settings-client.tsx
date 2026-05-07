"use client";

import { useState } from "react";
import type { UserRole } from "@/types/user";

type ProfileData = {
  fullName: string;
  email: string;
  role: UserRole;
  balance: string;
  avatarUrl: string | null;
  deliveryAddress: string | null;
  businessName: string | null;
  businessAddress: string | null;
  chefBio: string | null;
};

export function ProfileSettingsClient({ initialProfile }: { initialProfile: ProfileData }) {
  const [fullName, setFullName] = useState(initialProfile.fullName);
  const [avatarUrl, setAvatarUrl] = useState(initialProfile.avatarUrl ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState(initialProfile.deliveryAddress ?? "");
  const [businessName, setBusinessName] = useState(initialProfile.businessName ?? "");
  const [businessAddress, setBusinessAddress] = useState(initialProfile.businessAddress ?? "");
  const [chefBio, setChefBio] = useState(initialProfile.chefBio ?? "");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [balance, setBalance] = useState(initialProfile.balance);
  const [balanceAmount, setBalanceAmount] = useState("50");

  async function uploadAvatarIfSelected() {
    if (!avatarFile) return avatarUrl;

    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append("avatar", avatarFile);

    const uploadRes = await fetch("/api/profile/avatar", {
      method: "POST",
      body: formData,
    });
    setUploadingAvatar(false);

    const uploadJson = (await uploadRes.json()) as { error?: string; avatarUrl?: string };
    if (!uploadRes.ok || !uploadJson.avatarUrl) {
      throw new Error(uploadJson.error ?? "Avatar upload failed.");
    }

    setAvatarUrl(uploadJson.avatarUrl);
    setAvatarFile(null);
    return uploadJson.avatarUrl;
  }

  async function saveSettings() {
    setError(null);
    setMessage(null);
    setSaving(true);

    try {
      const finalAvatarUrl = await uploadAvatarIfSelected();

      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          avatarUrl: finalAvatarUrl,
          deliveryAddress,
          businessName,
          businessAddress,
          chefBio,
        }),
      });

      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(json.error ?? "Failed to save profile.");
        return;
      }

      setMessage("Profile settings updated.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  async function addBalance() {
    setError(null);
    setMessage(null);
    const amount = Number(balanceAmount);
    if (!amount || amount <= 0) {
      setError("Enter a valid amount to add.");
      return;
    }

    const response = await fetch("/api/profile/balance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    const json = (await response.json()) as { error?: string; balance?: string };
    if (!response.ok || !json.balance) {
      setError(json.error ?? "Could not add balance.");
      return;
    }

    setBalance(json.balance);
    setMessage(`Balance updated. New balance: $${Number(json.balance).toFixed(2)}`);
  }

  return (
    <section className="filter-section">
      <h2 className="dashboard-title">Profile Settings</h2>
      <p>Update your profile and role-specific fields.</p>

      <div className="supplier-form-grid profile-form-grid">
        <div className="supplier-field">
          <label className="supplier-label" htmlFor="fullName">
            Full Name
          </label>
          <input id="fullName" className="supplier-input" value={fullName} onChange={(event) => setFullName(event.target.value)} />
        </div>

        <div className="supplier-field">
          <label className="supplier-label" htmlFor="avatarFile">
            Profile Picture
          </label>
          <input id="avatarFile" className="supplier-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)} />
          <p className="profile-upload-hint">
            {avatarFile ? `Selected: ${avatarFile.name}` : avatarUrl ? "Current avatar will be kept unless new file is selected." : "No avatar yet."}
          </p>
        </div>
      </div>

      {initialProfile.role === "home_cook" ? (
        <div className="supplier-field profile-role-field">
          <label className="supplier-label" htmlFor="deliveryAddress">
            Address
          </label>
          <input
            id="deliveryAddress"
            className="supplier-input"
            placeholder="Delivery address"
            value={deliveryAddress}
            onChange={(event) => setDeliveryAddress(event.target.value)}
          />
        </div>
      ) : null}

      {initialProfile.role === "local_supplier" ? (
        <div className="supplier-form-grid profile-form-grid">
          <div className="supplier-field">
            <label className="supplier-label" htmlFor="businessName">
              Business Name
            </label>
            <input
              id="businessName"
              className="supplier-input"
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
            />
          </div>
          <div className="supplier-field">
            <label className="supplier-label" htmlFor="businessAddress">
              Business Address
            </label>
            <input
              id="businessAddress"
              className="supplier-input"
              value={businessAddress}
              onChange={(event) => setBusinessAddress(event.target.value)}
            />
          </div>
        </div>
      ) : null}

      {initialProfile.role === "verified_chef" ? (
        <div className="supplier-field profile-role-field">
          <label className="supplier-label" htmlFor="chefBio">
            Chef Bio
          </label>
          <input id="chefBio" className="supplier-input" value={chefBio} onChange={(event) => setChefBio(event.target.value)} />
        </div>
      ) : null}

      {error ? <p className="error-text profile-feedback">{error}</p> : null}
      {message ? <p className="ok-text profile-feedback">{message}</p> : null}

      <div className="supplier-form-grid profile-form-grid" style={{ marginTop: 12 }}>
        <div className="supplier-field">
          <label className="supplier-label" htmlFor="currentBalance">
            Current Balance
          </label>
          <input id="currentBalance" className="supplier-input" value={`$${Number(balance).toFixed(2)}`} disabled />
        </div>
        <div className="supplier-field">
          <label className="supplier-label" htmlFor="balanceAmount">
            Mock Add Balance
          </label>
          <div className="supplier-inline">
            <input
              id="balanceAmount"
              className="supplier-input"
              type="number"
              min="0.01"
              step="0.01"
              value={balanceAmount}
              onChange={(event) => setBalanceAmount(event.target.value)}
            />
            <button type="button" className="btn btn-secondary supplier-search-btn" onClick={addBalance}>
              Add
            </button>
          </div>
        </div>
      </div>

      <button type="button" className="btn btn-primary profile-save-btn" onClick={saveSettings} disabled={saving}>
        {saving || uploadingAvatar ? "Saving..." : "Save Settings"}
      </button>
    </section>
  );
}
