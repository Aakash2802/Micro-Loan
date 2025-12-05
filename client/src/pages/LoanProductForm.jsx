// client/src/pages/LoanProductForm.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loanProductAPI } from '../services/api';
import toast from 'react-hot-toast';

const LoanProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    code: '',
    category: 'personal',
    interestRate: '',
    interestType: 'reducing',
    minTenureMonths: '',
    maxTenureMonths: '',
    minAmount: '',
    maxAmount: '',
    processingFee: '0',
    processingFeeType: 'percentage',
    latePenaltyRate: '2',
    latePenaltyType: 'percentage',
    gracePeriodDays: '0',
    isActive: true,
    isPublished: false,
  });

  useEffect(() => {
    if (isEdit) {
      fetchProduct();
    }
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await loanProductAPI.getById(id);
      const product = response.data.data.product;
      setFormData({
        name: product.name || '',
        description: product.description || '',
        code: product.code || '',
        category: product.category || 'personal',
        interestRate: product.interestRate?.toString() || '',
        interestType: product.interestType || 'reducing',
        minTenureMonths: product.minTenureMonths?.toString() || '',
        maxTenureMonths: product.maxTenureMonths?.toString() || '',
        minAmount: product.minAmount?.toString() || '',
        maxAmount: product.maxAmount?.toString() || '',
        processingFee: product.processingFee?.toString() || '0',
        processingFeeType: product.processingFeeType || 'percentage',
        latePenaltyRate: product.latePenaltyRate?.toString() || '2',
        latePenaltyType: product.latePenaltyType || 'percentage',
        gracePeriodDays: product.gracePeriodDays?.toString() || '0',
        isActive: product.isActive,
        isPublished: product.isPublished,
      });
    } catch (error) {
      toast.error('Failed to load product');
      navigate('/dashboard/loan-products');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        interestRate: parseFloat(formData.interestRate),
        minTenureMonths: parseInt(formData.minTenureMonths),
        maxTenureMonths: parseInt(formData.maxTenureMonths),
        minAmount: parseFloat(formData.minAmount),
        maxAmount: parseFloat(formData.maxAmount),
        processingFee: parseFloat(formData.processingFee),
        latePenaltyRate: parseFloat(formData.latePenaltyRate),
        gracePeriodDays: parseInt(formData.gracePeriodDays),
      };

      if (isEdit) {
        await loanProductAPI.update(id, payload);
        toast.success('Product updated successfully');
      } else {
        await loanProductAPI.create(payload);
        toast.success('Product created successfully');
      }
      navigate('/dashboard/loan-products');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Edit Loan Product' : 'Create Loan Product'}
        </h1>
        <p className="text-gray-500">Configure loan product settings</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Product Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="input"
              required
            />
          </div>
          <div>
            <label className="label">Product Code *</label>
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleChange}
              className="input uppercase"
              placeholder="e.g., PL, BL"
              required
              disabled={isEdit}
            />
          </div>
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="input"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Category *</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="input"
              required
            >
              <option value="personal">Personal</option>
              <option value="business">Business</option>
              <option value="education">Education</option>
              <option value="vehicle">Vehicle</option>
              <option value="home">Home</option>
              <option value="gold">Gold</option>
              <option value="agriculture">Agriculture</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="label">Interest Type *</label>
            <select
              name="interestType"
              value={formData.interestType}
              onChange={handleChange}
              className="input"
            >
              <option value="reducing">Reducing Balance</option>
              <option value="flat">Flat Rate</option>
            </select>
          </div>
        </div>

        {/* Interest & Tenure */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Interest Rate (% p.a.) *</label>
            <input
              type="number"
              name="interestRate"
              value={formData.interestRate}
              onChange={handleChange}
              className="input"
              step="0.01"
              min="0"
              max="50"
              required
            />
          </div>
          <div>
            <label className="label">Min Tenure (months) *</label>
            <input
              type="number"
              name="minTenureMonths"
              value={formData.minTenureMonths}
              onChange={handleChange}
              className="input"
              min="1"
              required
            />
          </div>
          <div>
            <label className="label">Max Tenure (months) *</label>
            <input
              type="number"
              name="maxTenureMonths"
              value={formData.maxTenureMonths}
              onChange={handleChange}
              className="input"
              min="1"
              required
            />
          </div>
        </div>

        {/* Amount */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Minimum Amount (₹) *</label>
            <input
              type="number"
              name="minAmount"
              value={formData.minAmount}
              onChange={handleChange}
              className="input"
              min="1000"
              required
            />
          </div>
          <div>
            <label className="label">Maximum Amount (₹) *</label>
            <input
              type="number"
              name="maxAmount"
              value={formData.maxAmount}
              onChange={handleChange}
              className="input"
              min="1000"
              required
            />
          </div>
        </div>

        {/* Fees & Penalty */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Processing Fee</label>
            <div className="flex gap-2">
              <input
                type="number"
                name="processingFee"
                value={formData.processingFee}
                onChange={handleChange}
                className="input flex-1"
                min="0"
                step="0.01"
              />
              <select
                name="processingFeeType"
                value={formData.processingFeeType}
                onChange={handleChange}
                className="input w-24"
              >
                <option value="percentage">%</option>
                <option value="fixed">₹</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Late Penalty Rate</label>
            <input
              type="number"
              name="latePenaltyRate"
              value={formData.latePenaltyRate}
              onChange={handleChange}
              className="input"
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <label className="label">Grace Period (days)</label>
            <input
              type="number"
              name="gracePeriodDays"
              value={formData.gracePeriodDays}
              onChange={handleChange}
              className="input"
              min="0"
              max="30"
            />
          </div>
        </div>

        {/* Status */}
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm">Active</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="isPublished"
              checked={formData.isPublished}
              onChange={handleChange}
              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm">Published</span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-4 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/dashboard/loan-products')}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Saving...' : isEdit ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoanProductForm;
