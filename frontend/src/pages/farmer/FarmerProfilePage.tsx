import { useRef, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useI18n } from '../../contexts/I18nContext';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { PageHeader } from '../../components/ui/PageHeader';

const SOILS = ['Alluvial', 'Black', 'Red', 'Laterite', 'Sandy', 'Clay', 'Loamy'];
const IRRIGATIONS = ['Irrigated', 'Rain-fed'];

export function FarmerProfilePage() {
  const { user, updateUser } = useAuth();
  const { successToast, errorToast } = useToast();
  const { translate } = useI18n();

  const [name, setName] = useState(user?.name || '');
  const [location, setLocation] = useState(user?.location || '');
  const [landSize, setLandSize] = useState(user?.landSize ? String(user.landSize) : '');
  const [soilType, setSoilType] = useState(user?.soilType || 'Alluvial');
  const [irrigationType, setIrrigationType] = useState(user?.irrigationType || 'Irrigated');
  const [bio, setBio] = useState(user?.bio || '');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [avatar, setAvatar] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      errorToast(translate('farmer.profileNameShort'));
      return;
    }
    if (landSize && (!Number(landSize) || Number(landSize) <= 0)) {
      errorToast(translate('farmer.landSizeInvalid'));
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        location,
        soilType,
        irrigationType,
        bio,
        landSize: landSize ? Number(landSize) : user.landSize,
      };
      if (password) payload.password = password;
      const updated = await api.updateFarmer(user.id, payload);

      let final = updated;
      if (avatar) {
        const fd = new FormData();
        fd.append('avatar', avatar);
        final = await api.uploadFarmerAvatar(user.id, fd);
      }
      updateUser(final);
      setPassword('');
      setAvatar(null);
      successToast(translate('farmer.profileUpdated'));
    } catch (err) {
      errorToast(err instanceof Error ? err.message : translate('farmer.saveProfileError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title={translate('farmer.profileTitle')} subtitle={translate('farmer.profileSubtitle')} icon="👤" />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="h-fit text-center">
          <Avatar name={name} src={avatar ? undefined : user.avatarUrl} size="xl" className="mx-auto" />
          <h3 className="mt-3 font-semibold text-ink-900">{name}</h3>
          <p className="text-sm text-ink-500">{mobileLabel(user.mobile)}</p>
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
                ? translate('farmer.changeAvatar').replace('{name}', avatar.name)
                : translate('farmer.uploadPhoto')}
            </Button>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title={translate('farmer.farmDetails')} subtitle={translate('farmer.farmDetailsSubtitle')} />
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label={translate('farmer.fullName')} value={name} onChange={(e) => setName(e.target.value)} />
              <Input
                label={translate('farmer.locationLabel')}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={translate('farmer.locationPlaceholder')}
              />
              <Input
                label={translate('farmer.landSize')}
                type="number"
                min={0}
                step="0.5"
                value={landSize}
                onChange={(e) => setLandSize(e.target.value)}
              />
              <Select
                label={translate('farmer.soilType')}
                value={soilType}
                onChange={(e) => setSoilType(e.target.value)}
              >
                {SOILS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
              <Select
                label={translate('farmer.irrigationType')}
                value={irrigationType}
                onChange={(e) => setIrrigationType(e.target.value)}
              >
                {IRRIGATIONS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
              <Input
                label={translate('farmer.newPassword')}
                type="password"
                placeholder={translate('farmer.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Textarea
              label={translate('farmer.aboutFarm')}
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={translate('farmer.bioPlaceholder')}
            />
            <div className="flex justify-end">
              <Button type="submit" loading={saving} size="lg">
                {translate('farmer.saveChanges')}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

function mobileLabel(mobile: string): string {
  return mobile ? `+91 ${mobile}` : '';
}
