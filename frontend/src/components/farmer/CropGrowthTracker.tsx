import { useState, useId } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useI18n } from '../../contexts/I18nContext';
import { api } from '../../lib/api';
import {
  calculateCropProgress,
  estimateHarvestDate,
  getAllCropProfiles,
  getCropGrowthProfile,
  type CropProfile,
} from '../../lib/cropGrowth';
import type { Crop } from '../../lib/types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Spinner } from '../ui/Spinner';

export interface CropGrowthTrackerProps {
  crops: Crop[];
  onRefresh: () => void;
  loading?: boolean;
}

export function CropGrowthTracker({ crops, onRefresh, loading = false }: CropGrowthTrackerProps) {
  const { user } = useAuth();
  const { successToast, errorToast } = useToast();
  const { lang } = useI18n();

  // Unique IDs for accessible modal form inputs
  const selectId = useId();
  const customCropId = useId();
  const sowingDateId = useId();
  const harvestDateId = useId();
  const plotNameId = useId();
  const areaAcresId = useId();
  const statusSelectId = useId();
  const notesId = useId();

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCrop, setEditingCrop] = useState<Crop | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Crop | null>(null);
  const [expandedCropId, setExpandedCropId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Filter state: 'all' | 'growing' | 'harvest_ready' | 'harvested'
  const [filter, setFilter] = useState<'all' | 'growing' | 'harvest_ready' | 'harvested'>('all');

  // Form state
  const todayISO = new Date().toISOString().slice(0, 10);
  const [selectedCropName, setSelectedCropName] = useState('Onion');
  const [isCustomCrop, setIsCustomCrop] = useState(false);
  const [customCropName, setCustomCropName] = useState('');
  const [sowingDate, setSowingDate] = useState(todayISO);
  const [harvestDate, setHarvestDate] = useState(() => estimateHarvestDate(todayISO, 'Onion'));
  const [plotName, setPlotName] = useState('');
  const [areaAcres, setAreaAcres] = useState('');
  const [status, setStatus] = useState('Growing');
  const [notes, setNotes] = useState('');

  const cropProfiles = getAllCropProfiles();

  const openAddModal = (presetCropName?: string) => {
    setEditingCrop(null);
    const initialName = presetCropName || 'Onion';
    const profile = getCropGrowthProfile(initialName);
    setSelectedCropName(profile.nameEn);
    setIsCustomCrop(false);
    setCustomCropName('');
    setSowingDate(todayISO);
    setHarvestDate(estimateHarvestDate(todayISO, profile.nameEn));
    setPlotName('');
    setAreaAcres('');
    setStatus('Growing');
    setNotes('');
    setModalOpen(true);
  };

  const openEditModal = (crop: Crop) => {
    setEditingCrop(crop);
    const matchedCommon = cropProfiles.find(
      (p) => p.nameEn.toLowerCase() === crop.cropName.trim().toLowerCase(),
    );

    if (matchedCommon) {
      setSelectedCropName(matchedCommon.nameEn);
      setIsCustomCrop(false);
      setCustomCropName('');
    } else {
      setSelectedCropName('Custom');
      setIsCustomCrop(true);
      setCustomCropName(crop.cropName);
    }

    const sow = crop.sowingDate || todayISO;
    setSowingDate(sow);
    setHarvestDate(crop.harvestDate || estimateHarvestDate(sow, crop.cropName));
    setPlotName(crop.plotName || '');
    setAreaAcres(crop.areaAcres ? String(crop.areaAcres) : '');
    setStatus(crop.status || 'Growing');
    setNotes(crop.notes || '');
    setModalOpen(true);
  };

  const handleCropSelectChange = (cropName: string) => {
    if (cropName === 'Custom') {
      setIsCustomCrop(true);
      setSelectedCropName('Custom');
    } else {
      setIsCustomCrop(false);
      setSelectedCropName(cropName);
      setHarvestDate(estimateHarvestDate(sowingDate, cropName));
    }
  };

  const handleSowingDateChange = (newSowingDate: string) => {
    setSowingDate(newSowingDate);
    const activeName = isCustomCrop ? customCropName || 'General Crop' : selectedCropName;
    setHarvestDate(estimateHarvestDate(newSowingDate, activeName));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const finalCropName = isCustomCrop ? customCropName.trim() : selectedCropName;
    if (!finalCropName || finalCropName.length < 2) {
      errorToast('Please specify a valid crop name.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Partial<Crop> = {
        cropName: finalCropName,
        sowingDate: sowingDate || null,
        harvestDate: harvestDate || null,
        status,
        plotName: plotName.trim() || undefined,
        areaAcres: areaAcres ? Number(areaAcres) : undefined,
        notes: notes.trim() || undefined,
      };

      if (editingCrop) {
        await api.updateFarmerCrop(user.id, editingCrop.id, payload);
        successToast(`${finalCropName} growth plan updated!`);
      } else {
        await api.addCrop(user.id, payload);
        successToast(`Planting logged for ${finalCropName}!`);
      }

      setModalOpen(false);
      onRefresh();
    } catch (err) {
      errorToast(err instanceof Error ? err.message : 'Failed to save crop planting log.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickStatusUpdate = async (crop: Crop, newStatus: string) => {
    if (!user) return;
    try {
      await api.updateFarmerCrop(user.id, crop.id, { status: newStatus });
      successToast(`${crop.cropName} marked as ${newStatus}!`);
      onRefresh();
    } catch (err) {
      errorToast(err instanceof Error ? err.message : 'Failed to update crop status.');
    }
  };

  const handleDelete = async () => {
    if (!user || !deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteCrop(user.id, deleteTarget.id);
      successToast(`${deleteTarget.cropName} removed from tracker.`);
      setDeleteTarget(null);
      onRefresh();
    } catch (err) {
      errorToast(err instanceof Error ? err.message : 'Failed to delete crop record.');
    } finally {
      setDeleting(false);
    }
  };

  // Compute stats and progress for all crops
  const processedCrops = crops.map((c) => {
    const progress = calculateCropProgress(c.sowingDate, c.harvestDate, c.cropName, c.status);
    return {
      crop: c,
      progress,
    };
  });

  const activeCropsCount = processedCrops.filter(
    (item) => item.crop.status?.toLowerCase() !== 'harvested',
  ).length;

  const readyForHarvestCount = processedCrops.filter(
    (item) => item.progress.isReadyForHarvest && item.crop.status?.toLowerCase() !== 'harvested',
  ).length;

  const filteredCrops = processedCrops.filter((item) => {
    if (filter === 'growing') {
      return item.crop.status?.toLowerCase() !== 'harvested' && !item.progress.isReadyForHarvest;
    }
    if (filter === 'harvest_ready') {
      return item.progress.isReadyForHarvest && item.crop.status?.toLowerCase() !== 'harvested';
    }
    if (filter === 'harvested') {
      return item.crop.status?.toLowerCase() === 'harvested';
    }
    return true;
  });

  // Modal preview calculation
  const modalCropName = isCustomCrop ? customCropName || 'General Crop' : selectedCropName;
  const modalProgress = calculateCropProgress(sowingDate, harvestDate, modalCropName, status);

  const getLocalizedName = (profile: CropProfile) => {
    if (lang === 'hi' && profile.nameHi) return profile.nameHi;
    if (lang === 'mr' && profile.nameMr) return profile.nameMr;
    return profile.nameEn;
  };

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-crop-100 text-lg">
              🌱
            </span>
            <div>
              <h3 className="text-lg font-bold text-ink-900">
                {lang === 'hi'
                  ? 'फसल विकास एवं कटाई ट्रैकर'
                  : lang === 'mr'
                    ? 'पीक वाढ व काढणी ट्रॅकर'
                    : 'Crop Growth & Harvest Tracker'}
              </h3>
              <p className="text-xs text-ink-500">
                {lang === 'hi'
                  ? 'बुवाई की तारीख दर्ज करें और सटीक कटाई समय-सीमा ट्रैक करें'
                  : lang === 'mr'
                    ? 'पेरणीची तारीख नोंदवा आणि अपेक्षित काढणीचे नियोजन करा'
                    : 'Log planting dates, track physiological stages & estimate harvest timelines'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {readyForHarvestCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-harvest-100 px-3 py-1 text-xs font-semibold text-harvest-700 animate-pulse">
              <span>🌾</span>
              <span>
                {readyForHarvestCount}{' '}
                {lang === 'hi' ? 'कटाई के लिए तैयार' : lang === 'mr' ? 'काढणीस तयार' : 'Ready to Harvest'}
              </span>
            </span>
          )}
          <Button onClick={() => openAddModal()} variant="primary" className="text-xs font-semibold">
            + {lang === 'hi' ? 'नई बुवाई दर्ज करें' : lang === 'mr' ? 'नवीन लागवड नोंदवा' : 'Log New Planting'}
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      {processedCrops.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-ink-100 pb-3 text-xs">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
              filter === 'all' ? 'bg-crop-600 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
            }`}
          >
            {lang === 'hi' ? 'सभी फसलें' : lang === 'mr' ? 'सर्व पिके' : 'All Plantings'} ({processedCrops.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('growing')}
            className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
              filter === 'growing' ? 'bg-crop-600 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
            }`}
          >
            {lang === 'hi' ? 'विकासशील' : lang === 'mr' ? 'वाढ चालू' : 'Growing'} ({activeCropsCount - readyForHarvestCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('harvest_ready')}
            className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
              filter === 'harvest_ready' ? 'bg-crop-600 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
            }`}
          >
            {lang === 'hi' ? 'कटाई तैयार' : lang === 'mr' ? 'काढणीस तयार' : 'Harvest Ready'} ({readyForHarvestCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('harvested')}
            className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
              filter === 'harvested' ? 'bg-crop-600 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
            }`}
          >
            {lang === 'hi' ? 'कटाई संपन्न' : lang === 'mr' ? 'काढणी झालेली' : 'Harvested'} (
            {processedCrops.length - activeCropsCount})
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-10">
          <Spinner size="md" />
        </div>
      )}

      {/* Empty State */}
      {!loading && processedCrops.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-ink-200 bg-cream/50 p-8 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-crop-100 text-3xl">
            🌱
          </div>
          <div>
            <h4 className="text-base font-bold text-ink-900">
              {lang === 'hi' ? 'कोई फसल पंजीकृत नहीं है' : lang === 'mr' ? 'अद्याप कोणतेही पीक नोंदवलेले नाही' : 'No Planted Crops Logged Yet'}
            </h4>
            <p className="mt-1 text-xs text-ink-500 max-w-md mx-auto">
              {lang === 'hi'
                ? 'बुवाई की तारीख दर्ज करें। सिस्टम स्वचालित रूप से विकास के चरण और अपेक्षित कटाई की गणना करेगा।'
                : lang === 'mr'
                  ? 'लागवडीची तारीख नोंदवून अपेक्षित काढणी आणि वाढीच्या टप्प्यांचा मागोवा घ्या.'
                  : 'Log your planting dates to track stage-by-stage growth progress, water requirements, and calculate automated harvest dates.'}
            </p>
          </div>

          <div className="pt-2">
            <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2.5">
              {lang === 'hi' ? 'त्वरित शुरुआत करें' : lang === 'mr' ? 'झटपट सुरू करा' : 'Quick Start with Popular Crops'}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => openAddModal('Onion')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3.5 py-2 text-xs font-medium text-ink-800 shadow-sm hover:border-crop-500 hover:text-crop-700 transition"
              >
                <span>🧅</span> Onion (120d)
              </button>
              <button
                type="button"
                onClick={() => openAddModal('Tomato')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3.5 py-2 text-xs font-medium text-ink-800 shadow-sm hover:border-crop-500 hover:text-crop-700 transition"
              >
                <span>🍅</span> Tomato (90d)
              </button>
              <button
                type="button"
                onClick={() => openAddModal('Wheat')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3.5 py-2 text-xs font-medium text-ink-800 shadow-sm hover:border-crop-500 hover:text-crop-700 transition"
              >
                <span>🌾</span> Wheat (120d)
              </button>
              <button
                type="button"
                onClick={() => openAddModal('Cotton')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3.5 py-2 text-xs font-medium text-ink-800 shadow-sm hover:border-crop-500 hover:text-crop-700 transition"
              >
                <span>☁️</span> Cotton (165d)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Crops Cards List */}
      {!loading && filteredCrops.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredCrops.map(({ crop, progress }) => {
            const isHarvested = crop.status?.toLowerCase() === 'harvested';
            const isExpanded = expandedCropId === crop.id;
            const profile = progress.cropProfile;
            const currentStage = progress.currentStage;

            return (
              <div
                key={crop.id}
                className="flex flex-col justify-between rounded-xl border border-ink-200 bg-gradient-to-b from-white to-ink-50/40 p-4 transition-all hover:border-crop-400 hover:shadow-md"
              >
                <div className="space-y-3.5">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-crop-50 border border-crop-200 text-2xl overflow-hidden shadow-inner">
                        {profile.image ? (
                          <img
                            src={profile.image}
                            alt={crop.cropName}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              // Fallback to emoji if image cannot be loaded
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span>{profile.icon}</span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-ink-900 text-base">{crop.cropName}</h4>
                          {profile.nameEn.toLowerCase() !== crop.cropName.toLowerCase() && (
                            <span className="text-xs text-ink-400">({profile.nameEn})</span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
                          {crop.plotName ? (
                            <span className="font-medium text-ink-700">📍 {crop.plotName}</span>
                          ) : (
                            <span>Main Farm</span>
                          )}
                          {crop.areaAcres ? (
                            <span>· {crop.areaAcres} {lang === 'hi' ? 'एकड़' : lang === 'mr' ? 'एकर' : 'acres'}</span>
                          ) : null}
                          <span>· {profile.season}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div>
                      {isHarvested ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-ink-200 px-2.5 py-1 text-xs font-semibold text-ink-700">
                          <span>✅</span> {lang === 'hi' ? 'कटाई संपन्न' : lang === 'mr' ? 'काढणी झालेली' : 'Harvested'}
                        </span>
                      ) : progress.isReadyForHarvest ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-harvest-100 border border-harvest-300 px-2.5 py-1 text-xs font-bold text-harvest-700 animate-pulse">
                          <span>🌾</span> {lang === 'hi' ? 'कटाई तैयार' : lang === 'mr' ? 'काढणीस तयार' : 'Harvest Ready'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-crop-100 border border-crop-200 px-2.5 py-1 text-xs font-semibold text-crop-800">
                          <span>🌱</span> {lang === 'hi' ? 'विकासशील' : lang === 'mr' ? 'वाढ चालू' : 'Growing'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar & Percentage */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-ink-700">
                        {isHarvested
                          ? '100% Completed'
                          : `${progress.percent}% Progress · Day ${progress.daysElapsed} of ${progress.totalDays}`}
                      </span>
                      <span className="font-bold text-crop-700">
                        {isHarvested
                          ? 'Harvest Complete'
                          : progress.isReadyForHarvest
                            ? 'Ready to Harvest!'
                            : `${progress.daysRemaining} days left`}
                      </span>
                    </div>

                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink-100">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          isHarvested
                            ? 'bg-ink-400'
                            : progress.isReadyForHarvest
                              ? 'bg-gradient-to-r from-harvest-500 to-amber-500'
                              : 'bg-gradient-to-r from-crop-500 to-crop-600'
                        }`}
                        style={{ width: `${progress.percent}%` }}
                      />
                    </div>

                    {/* Sowing & Harvest dates row */}
                    <div className="flex items-center justify-between text-[11px] text-ink-500 pt-0.5">
                      <span>
                        🌱 {lang === 'hi' ? 'बोया:' : lang === 'mr' ? 'पेरणी:' : 'Sown:'}{' '}
                        <strong className="text-ink-700">{progress.sowingDateFormatted}</strong>
                      </span>
                      <span>
                        🚜 {lang === 'hi' ? 'अनुमानित कटाई:' : lang === 'mr' ? 'अपेक्षित काढणी:' : 'Est. Harvest:'}{' '}
                        <strong className="text-crop-800">{progress.estimatedHarvestDateFormatted}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Current Physiological Stage Banner */}
                  <div className="rounded-xl border border-crop-100 bg-crop-50/70 p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-crop-900 flex items-center gap-1.5">
                        <span>{currentStage.icon}</span>
                        <span>
                          {lang === 'hi' && currentStage.nameHi
                            ? currentStage.nameHi
                            : lang === 'mr' && currentStage.nameMr
                              ? currentStage.nameMr
                              : currentStage.name}
                        </span>
                      </span>
                      <span className="text-[10px] uppercase font-semibold text-crop-600 bg-crop-100/70 rounded-md px-1.5 py-0.5">
                        Stage {progress.currentStageIndex + 1}/{progress.stagesWithTimeline.length}
                      </span>
                    </div>
                    <p className="text-ink-600 text-[11px] leading-relaxed">
                      {currentStage.description}
                    </p>
                    {currentStage.actionTip && (
                      <div className="mt-1 flex items-start gap-1.5 text-[11px] font-medium text-crop-800 bg-white/70 rounded-lg p-2 border border-crop-200/60">
                        <span className="text-amber-600">💡</span>
                        <span>{currentStage.actionTip}</span>
                      </div>
                    )}
                  </div>

                  {/* Expandable Stages Timeline */}
                  {isExpanded && (
                    <div className="pt-2 border-t border-ink-100 space-y-2">
                      <p className="text-xs font-bold text-ink-800">
                        {lang === 'hi' ? 'विकास चरण समय-सीमा' : lang === 'mr' ? 'वाढीचे टप्पे व वेळापत्रक' : 'Complete Stage Timeline'}:
                      </p>
                      <div className="relative pl-4 space-y-3 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-ink-200">
                        {progress.stagesWithTimeline.map((stage, idx) => (
                          <div key={stage.id} className="relative flex items-start gap-2.5 text-xs">
                            <span
                              className={`absolute -left-4 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] font-bold ${
                                stage.isPast
                                  ? 'bg-crop-600 text-white'
                                  : stage.isCurrent
                                    ? 'bg-harvest-500 text-white ring-4 ring-harvest-100'
                                    : 'bg-ink-300 text-white'
                              }`}
                            >
                              {stage.isPast ? '✓' : idx + 1}
                            </span>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className={`font-semibold ${stage.isCurrent ? 'text-crop-900 font-bold' : 'text-ink-800'}`}>
                                  {stage.icon} {lang === 'hi' && stage.nameHi ? stage.nameHi : lang === 'mr' && stage.nameMr ? stage.nameMr : stage.name}
                                </span>
                                <span className="text-[10px] text-ink-500">
                                  {stage.startDateFormatted}
                                </span>
                              </div>
                              <p className="text-[11px] text-ink-500">{stage.actionTip}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="mt-4 pt-3 border-t border-ink-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setExpandedCropId(isExpanded ? null : crop.id)}
                    className="text-xs font-semibold text-crop-700 hover:text-crop-900 underline decoration-dotted"
                  >
                    {isExpanded
                      ? lang === 'hi' ? 'कम देखें' : lang === 'mr' ? 'कमी माहिती' : 'Hide Stages'
                      : lang === 'hi' ? 'चरण समय-सीमा देखें' : lang === 'mr' ? 'टप्पे पहा' : 'View Timeline Stages'}
                  </button>

                  <div className="flex items-center gap-1.5">
                    {!isHarvested && (
                      <button
                        type="button"
                        onClick={() => handleQuickStatusUpdate(crop, 'Harvested')}
                        className="rounded-lg bg-crop-50 hover:bg-crop-100 text-crop-800 border border-crop-200 px-2.5 py-1 text-xs font-semibold transition"
                      >
                        ✓ {lang === 'hi' ? 'कटाई दर्ज करें' : lang === 'mr' ? 'काढणी झाली' : 'Mark Harvested'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEditModal(crop)}
                      className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 hover:text-ink-800 transition"
                      title="Edit planting dates"
                      aria-label={`Edit ${crop.cropName}`}
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(crop)}
                      className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 transition"
                      title="Remove crop log"
                      aria-label={`Delete ${crop.cropName}`}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Log / Edit Planting Form */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editingCrop
            ? `${lang === 'hi' ? 'फसल विवरण संपादित करें' : lang === 'mr' ? 'पीक माहिती बदला' : 'Edit Planting Details'} · ${editingCrop.cropName}`
            : lang === 'hi'
              ? 'नई फसल बुवाई दर्ज करें'
              : lang === 'mr'
                ? 'नवीन पीक लागवड नोंदवा'
                : 'Log New Crop Planting'
        }
        size="lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
          {/* Crop Selector */}
          <div>
            <label htmlFor={selectId} className="block font-semibold text-ink-800 mb-1">
              {lang === 'hi' ? 'फसल चुनें' : lang === 'mr' ? 'पीक निवडा' : 'Select Crop'} *
            </label>
            <select
              id={selectId}
              value={isCustomCrop ? 'Custom' : selectedCropName}
              onChange={(e) => handleCropSelectChange(e.target.value)}
              className="w-full rounded-xl border border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 focus:border-crop-500 focus:outline-none focus:ring-1 focus:ring-crop-500"
            >
              {cropProfiles.map((p) => (
                <option key={p.nameEn} value={p.nameEn}>
                  {p.icon} {getLocalizedName(p)} ({p.durationDays} days duration · {p.season})
                </option>
              ))}
              <option value="Custom">✨ Other Crop (Custom Name)</option>
            </select>
          </div>

          {isCustomCrop && (
            <div>
              <label htmlFor={customCropId} className="block font-semibold text-ink-800 mb-1">
                Custom Crop Name *
              </label>
              <input
                id={customCropId}
                type="text"
                required
                placeholder="e.g. Mustard, Brinjal, Sunflower"
                value={customCropName}
                onChange={(e) => {
                  setCustomCropName(e.target.value);
                  setHarvestDate(estimateHarvestDate(sowingDate, e.target.value));
                }}
                className="w-full rounded-xl border border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 focus:border-crop-500 focus:outline-none"
              />
            </div>
          )}

          {/* Sowing & Harvest Date Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor={sowingDateId} className="block font-semibold text-ink-800 mb-1">
                🌱 {lang === 'hi' ? 'बुवाई / रोपाई की तारीख' : lang === 'mr' ? 'पेरणी / लागवड तारीख' : 'Planting / Sowing Date'} *
              </label>
              <input
                id={sowingDateId}
                type="date"
                required
                value={sowingDate}
                onChange={(e) => handleSowingDateChange(e.target.value)}
                className="w-full rounded-xl border border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 focus:border-crop-500 focus:outline-none"
              />
              <span className="text-[11px] text-ink-500 mt-0.5 block">
                When seeds were sown in field.
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor={harvestDateId} className="block font-semibold text-ink-800">
                  🚜 {lang === 'hi' ? 'अपेक्षित कटाई तारीख' : lang === 'mr' ? 'अपेक्षित काढणी तारीख' : 'Estimated Harvest Date'} *
                </label>
                <button
                  type="button"
                  onClick={() => setHarvestDate(estimateHarvestDate(sowingDate, modalCropName))}
                  className="text-[11px] text-crop-700 hover:underline"
                >
                  Auto-calculate
                </button>
              </div>
              <input
                id={harvestDateId}
                type="date"
                required
                value={harvestDate}
                onChange={(e) => setHarvestDate(e.target.value)}
                className="w-full rounded-xl border border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 focus:border-crop-500 focus:outline-none"
              />
              <span className="text-[11px] text-ink-500 mt-0.5 block">
                Calculated from crop maturity duration (~{modalProgress.totalDays} days).
              </span>
            </div>
          </div>

          {/* Plot Name & Area */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor={plotNameId} className="block font-semibold text-ink-800 mb-1">
                📍 {lang === 'hi' ? 'खेत / प्लॉट का नाम' : lang === 'mr' ? 'शेत / प्लॉटचे नाव' : 'Field / Plot Name'}
              </label>
              <input
                id={plotNameId}
                type="text"
                placeholder="e.g. North Plot B, River Field"
                value={plotName}
                onChange={(e) => setPlotName(e.target.value)}
                className="w-full rounded-xl border border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 focus:border-crop-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor={areaAcresId} className="block font-semibold text-ink-800 mb-1">
                📐 {lang === 'hi' ? 'क्षेत्रफल (एकड़)' : lang === 'mr' ? 'क्षेत्र (एकर)' : 'Area in Acres'}
              </label>
              <input
                id={areaAcresId}
                type="number"
                step="0.1"
                min="0.1"
                max="500"
                placeholder="e.g. 2.5"
                value={areaAcres}
                onChange={(e) => setAreaAcres(e.target.value)}
                className="w-full rounded-xl border border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 focus:border-crop-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Status & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor={statusSelectId} className="block font-semibold text-ink-800 mb-1">
                Status
              </label>
              <select
                id={statusSelectId}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 focus:border-crop-500 focus:outline-none"
              >
                <option value="Planted">🌱 Just Planted</option>
                <option value="Growing">🌿 Growing Active</option>
                <option value="Harvest Ready">🌾 Harvest Ready</option>
                <option value="Harvested">✅ Harvested</option>
              </select>
            </div>

            <div>
              <label htmlFor={notesId} className="block font-semibold text-ink-800 mb-1">
                Notes / Variety (Optional)
              </label>
              <input
                id={notesId}
                type="text"
                placeholder="e.g. Certified F1 hybrid, drip fertigated"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 focus:border-crop-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Live Timeline Calculation Preview Box */}
          <div className="rounded-xl border border-crop-200 bg-crop-50/60 p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-crop-900 flex items-center gap-1.5">
                <span>⏱️</span>
                <span>Harvest Timeline Estimate</span>
              </span>
              <span className="rounded-full bg-crop-200/80 px-2 py-0.5 font-bold text-crop-800 text-[11px]">
                Total Duration: ~{modalProgress.totalDays} days
              </span>
            </div>
            <p className="text-[11px] text-ink-600">
              Planting on <strong>{modalProgress.sowingDateFormatted}</strong> is projected to reach full harvest maturity on{' '}
              <strong className="text-crop-800">{modalProgress.estimatedHarvestDateFormatted}</strong>.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
              {modalProgress.stagesWithTimeline.map((st, i) => (
                <div key={st.id} className="rounded-lg bg-white p-2 border border-ink-100 text-center space-y-0.5">
                  <span className="text-base">{st.icon}</span>
                  <p className="font-bold text-[10px] text-ink-800 truncate" title={st.name}>
                    {i + 1}. {st.name}
                  </p>
                  <p className="text-[9px] text-ink-500">{st.startDateFormatted}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end gap-2.5 pt-2 border-t border-ink-100">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              {editingCrop ? 'Save Changes' : 'Log Planting'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Remove Crop Record"
        message={
          deleteTarget
            ? `Are you sure you want to remove the growth tracking record for ${deleteTarget.cropName}? Any logged harvest milestones for this planting will be deleted.`
            : ''
        }
        confirmLabel="Remove Record"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
