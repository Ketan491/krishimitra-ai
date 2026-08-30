import { useRef, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useI18n } from '../../contexts/I18nContext';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/StateComponents';
import { useAsync } from '../../hooks/useAsync';
import { validateAddressForm } from '../../lib/validators';
import type { Address } from '../../lib/types';

export function CustomerProfilePage() {
  const { user, updateUser } = useAuth();
  const { successToast, errorToast } = useToast();
  const { translate } = useI18n();
  const { data: addresses, reload: reloadAddresses } = useAsync<Address[]>(
    () => api.getAddresses(user!.id),
    [user?.id],
  );

  const [name, setName] = useState(user?.name || '');
  const [location, setLocation] = useState(user?.location || '');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [addr, setAddr] = useState({ label: 'Home', fullAddress: '', pincode: '', phone: '' });
  const [addrId, setAddrId] = useState<number | null>(null);
  const [addrError, setAddrError] = useState<string | null>(null);
  const [deleteAddressId, setDeleteAddressId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingAddr, setSavingAddr] = useState(false);

  if (!user) return null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      errorToast(translate('customer.profileNameShort'));
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { name: name.trim(), location };
      if (password) payload.password = password;
      let final = await api.updateCustomer(user.id, payload);
      if (avatar) {
        const fd = new FormData();
        fd.append('avatar', avatar);
        final = await api.uploadCustomerAvatar(user.id, fd);
      }
      updateUser(final);
      setPassword('');
      setAvatar(null);
      successToast(translate('customer.profileUpdated'));
    } catch (err) {
      errorToast(err instanceof Error ? err.message : translate('customer.saveProfileError'));
    } finally {
      setSaving(false);
    }
  };

  const saveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateAddressForm(addr);
    if (!check.valid) {
      setAddrError(check.message || translate('customer.invalidAddress'));
      return;
    }
    setSavingAddr(true);
    setAddrError(null);
    try {
      if (addrId) {
        await api.updateAddress(user.id, addrId, {
          ...addr,
          phone: addr.phone || undefined,
          pincode: addr.pincode || undefined,
        });
      } else {
        await api.addAddress(user.id, { ...addr, phone: addr.phone || undefined, pincode: addr.pincode || undefined });
      }
      successToast(addrId ? translate('customer.addressUpdated') : translate('customer.addressAdded'));
      setAddr({ label: 'Home', fullAddress: '', pincode: '', phone: '' });
      setAddrId(null);
      reloadAddresses();
    } catch (err) {
      errorToast(err instanceof Error ? err.message : translate('customer.saveAddressError'));
    } finally {
      setSavingAddr(false);
    }
  };

  const editAddress = (a: Address) => {
    setAddrId(a.id);
    setAddr({ label: a.label, fullAddress: a.fullAddress, pincode: a.pincode || '', phone: a.phone || '' });
  };

  const doDeleteAddress = async () => {
    if (!deleteAddressId) return;
    setSavingAddr(true);
    try {
      await api.deleteAddress(user.id, deleteAddressId);
      successToast(translate('customer.addressRemoved'));
      setDeleteAddressId(null);
      reloadAddresses();
    } catch (err) {
      errorToast(err instanceof Error ? err.message : translate('customer.deleteAddressError'));
    } finally {
      setSavingAddr(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={translate('customer.profileTitle')}
        subtitle={translate('customer.profileSubtitle')}
        icon="👤"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="h-fit text-center">
          <Avatar name={name} src={avatar ? undefined : user.avatarUrl} size="xl" className="mx-auto" />
          <h3 className="mt-3 font-semibold text-ink-900">{name}</h3>
          <p className="text-sm text-ink-500">+91 {user.mobile}</p>
          <div className="mt-4">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setAvatar(e.target.files?.[0] || null)}
            />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              {avatar
                ? translate('customer.changeAvatar').replace('{name}', avatar.name)
                : translate('customer.uploadPhoto')}
            </Button>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title={translate('customer.accountDetails')} />
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label={translate('customer.fullName')} value={name} onChange={(e) => setName(e.target.value)} />
              <Input
                label={translate('customer.locationCity')}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={translate('customer.locationCityPlaceholder')}
              />
              <Input label={translate('customer.mobileLabel')} value={user.mobile} disabled />
              <Input
                label={translate('customer.newPassword')}
                type="password"
                placeholder={translate('customer.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={saving}>
                {translate('customer.saveChanges')}
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CardHeader
            title={translate('customer.savedAddresses')}
            subtitle={translate('customer.savedAddressesSubtitle')}
          />
          {!addresses || addresses.length === 0 ? (
            <EmptyState title={translate('customer.noAddresses')} message={translate('customer.noAddressesMsg')} />
          ) : (
            <div className="space-y-3">
              {addresses.map((a) => (
                <Card key={a.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="flex items-center gap-2 font-semibold text-ink-900">
                        {a.label}
                        {a.isDefault ? (
                          <span className="rounded-full bg-crop-100 px-2 py-0.5 text-[10px] font-bold text-crop-800">
                            {translate('customer.defaultBadge')}
                          </span>
                        ) : null}
                      </p>
                      <p className="text-sm text-ink-600">{a.fullAddress}</p>
                      <p className="text-xs text-ink-400">
                        {a.pincode ? `${translate('customer.pinCode').replace('{code}', a.pincode)}` : ''}
                        {a.phone ? ` · ${a.phone}` : ''}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => editAddress(a)}>
                        ✏️
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setDeleteAddressId(a.id)}>
                        🗑
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Card className="h-fit">
          <CardHeader title={addrId ? translate('customer.editAddress') : translate('customer.addAddress')} />
          <form onSubmit={saveAddress} className="space-y-3">
            <Input
              label={translate('customer.addressLabel')}
              placeholder={translate('customer.addressLabelPlaceholder')}
              value={addr.label}
              onChange={(e) => setAddr({ ...addr, label: e.target.value })}
            />
            <Input
              label={translate('customer.fullAddressRequired')}
              placeholder={translate('customer.fullAddressPlaceholder')}
              value={addr.fullAddress}
              onChange={(e) => setAddr({ ...addr, fullAddress: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label={translate('customer.pincode')}
                maxLength={6}
                placeholder="411001"
                value={addr.pincode}
                onChange={(e) => setAddr({ ...addr, pincode: e.target.value.replace(/[^\d]/g, '') })}
              />
              <Input
                label={translate('customer.phone')}
                maxLength={10}
                placeholder={translate('customer.phonePlaceholder')}
                value={addr.phone}
                onChange={(e) => setAddr({ ...addr, phone: e.target.value.replace(/[^\d]/g, '') })}
              />
            </div>
            {addrError ? <p className="text-xs text-red-600">{addrError}</p> : null}
            <div className="flex justify-end gap-2">
              {addrId ? (
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => {
                    setAddrId(null);
                    setAddr({ label: 'Home', fullAddress: '', pincode: '', phone: '' });
                    setAddrError(null);
                  }}
                >
                  {translate('common.cancel')}
                </Button>
              ) : null}
              <Button type="submit" loading={savingAddr}>
                {addrId ? translate('customer.update') : translate('customer.addAddressBtn')}
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <ConfirmDialog
        open={Boolean(deleteAddressId)}
        title={translate('customer.deleteAddressTitle')}
        message={translate('customer.deleteAddressMsg')}
        onConfirm={doDeleteAddress}
        onCancel={() => setDeleteAddressId(null)}
        loading={savingAddr}
        confirmLabel={translate('common.delete')}
      />
    </div>
  );
}
