import { useState, useEffect } from 'react';
import { Modal } from '@/lib/Modal';
import { PrimaryButton, SecondaryButton } from '@/lib/Actions';
import { customersApi } from '@/api/client';
import type { Customer } from '@/types';
import { ar } from '@/i18n/ar';
import { Sparkles } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (customer: Customer) => void;
}

export function QuickAddCustomerModal({ isOpen, onClose, onSuccess }: Props) {
  const [formData, setFormData] = useState({
    bkCode: '',
    customerType: 'عام',
    name: '',
    phone: '',
    address: '',
    department: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-generate code whenever the modal is opened
  useEffect(() => {
    if (isOpen) {
      setError('');
      setFormData({
        bkCode: '',
        customerType: 'عام',
        name: '',
        phone: '',
        address: '',
        department: '',
        notes: '',
      });
      customersApi.generateBkCode()
        .then(({ bkCode }) => {
          setFormData(prev => ({ ...prev, bkCode }));
        })
        .catch((err) => {
          console.error('Failed to generate BK code:', err);
        });
    }
  }, [isOpen]);

  const handleGenerateCode = async () => {
    try {
      const { bkCode } = await customersApi.generateBkCode();
      setFormData(prev => ({ ...prev, bkCode }));
    } catch (err) {
      console.error('Failed to generate BK code:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('يرجى إدخال اسم العميل');
      return;
    }
    if (!formData.bkCode.trim()) {
      setError('يرجى إدخال كود العميل');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const created = await customersApi.create(formData);
      onSuccess(created);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || ar.common.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إضافة عميل جديد" zIndex="z-[60]" maxWidth="max-w-lg">
      {error && <div className="smart-alert smart-alert-error mb-4">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4 text-right">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">{ar.customers.bkCode} *</label>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={formData.bkCode}
                onChange={(e) => setFormData({ ...formData, bkCode: e.target.value })}
                className="flex-1 min-w-0 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#0A2472]/20 focus:border-[#0A2472] transition-colors"
                placeholder="مثال: BK-1001"
                required
              />
              <button
                type="button"
                onClick={handleGenerateCode}
                title="توليد كود تلقائي"
                className="shrink-0 px-3 py-2 bg-blue-50 text-[#0A2472] hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>توليد</span>
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">{ar.customers.customerType} *</label>
            <select
              value={formData.customerType}
              onChange={(e) => setFormData({ ...formData, customerType: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#0A2472]/20 focus:border-[#0A2472] transition-colors"
              required
            >
              <option value="عام">عام</option>
              <option value="مخبز">مخبز</option>
              <option value="تموين">تموين</option>
              <option value="أخرى">أخرى</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">{ar.customers.name} *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="أدخل اسم العميل ثلاثي أو رباعي"
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2472]/20 focus:border-[#0A2472]"
            required
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">{ar.customers.phone}</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="01xxxxxxxxx"
              className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-[#0A2472]/20 focus:border-[#0A2472]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">الإدارة</label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              placeholder="مثال: إدارة شرق"
              className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-[#0A2472]/20 focus:border-[#0A2472]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">{ar.customers.address}</label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="العنوان التفصيلي"
            className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-[#0A2472]/20 focus:border-[#0A2472]"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">{ar.customers.notes}</label>
          <input
            type="text"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="ملاحظات إضافية إن وجدت"
            className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-[#0A2472]/20 focus:border-[#0A2472]"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
          <SecondaryButton type="button" onClick={onClose} disabled={loading}>
            {ar.common.cancel}
          </SecondaryButton>
          <PrimaryButton type="submit" disabled={loading}>
            {loading ? ar.common.loading : 'حفظ واختيار العميل'}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}
