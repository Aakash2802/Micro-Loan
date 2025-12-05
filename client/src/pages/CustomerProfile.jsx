// client/src/pages/CustomerProfile.jsx
import { useState, useEffect, useRef } from 'react';
import { customerAPI, documentAPI } from '../services/api';
import { formatDate } from '../utils/formatDate';
import { formatCurrency } from '../utils/formatCurrency';
import toast from 'react-hot-toast';

const CustomerProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('personal');
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Form states
  const [addressForm, setAddressForm] = useState({
    street: '',
    city: '',
    state: '',
    pincode: '',
  });

  const [employmentForm, setEmploymentForm] = useState({
    employmentType: '',
    employerName: '',
    designation: '',
    monthlyIncome: '',
    workExperience: '',
  });

  const [kycForm, setKycForm] = useState({
    type: 'aadhaar',
    number: '',
    file: null,
  });
  const [kycDocs, setKycDocs] = useState([]);
  const [filePreview, setFilePreview] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchProfile();
    fetchKYCDocs();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await customerAPI.getMyProfile();
      const data = response.data.data.customer;
      setProfile(data);

      // Initialize form data
      setAddressForm({
        street: data.address?.street || '',
        city: data.address?.city || '',
        state: data.address?.state || '',
        pincode: data.address?.pincode || '',
      });

      setEmploymentForm({
        employmentType: data.employmentType || '',
        employerName: data.employerName || '',
        designation: data.designation || '',
        monthlyIncome: data.monthlyIncome || '',
        workExperience: data.workExperience || '',
      });
    } catch (error) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchKYCDocs = async () => {
    try {
      const response = await documentAPI.getMyKYC();
      setKycDocs(response.data.data.documents || []);
    } catch (error) {
      // Silently fail - profile KYC docs will be used as fallback
    }
  };

  const handleFileSelect = (file) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPG, PNG, and PDF files are allowed');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setFilePreview('pdf');
    }

    setKycForm({ ...kycForm, file });
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const clearFileSelection = () => {
    setKycForm({ ...kycForm, file: null });
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteKYC = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      await documentAPI.deleteKYC(docId);
      toast.success('Document deleted successfully');
      fetchKYCDocs();
      fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete document');
    }
  };

  const handleSaveAddress = async () => {
    // Validate required fields
    if (!addressForm.street?.trim()) {
      toast.error('Street address is required');
      return;
    }
    if (!addressForm.city?.trim()) {
      toast.error('City is required');
      return;
    }
    if (!addressForm.state?.trim()) {
      toast.error('State is required');
      return;
    }
    if (!addressForm.pincode?.trim() || !/^\d{6}$/.test(addressForm.pincode)) {
      toast.error('Please enter a valid 6-digit pincode');
      return;
    }

    try {
      setSaving(true);
      await customerAPI.updateMyProfile({ address: addressForm });
      toast.success('Address updated successfully');
      setEditing(null);
      fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update address');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmployment = async () => {
    try {
      setSaving(true);
      await customerAPI.updateMyProfile({
        employmentType: employmentForm.employmentType,
        employerName: employmentForm.employerName,
        designation: employmentForm.designation,
        monthlyIncome: parseFloat(employmentForm.monthlyIncome),
        workExperience: parseInt(employmentForm.workExperience),
      });
      toast.success('Employment details updated successfully');
      setEditing(null);
      fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update employment details');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadKyc = async (e) => {
    e.preventDefault();
    if (!kycForm.file) {
      toast.error('Please select a document file');
      return;
    }

    try {
      setUploadingDoc(true);

      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(kycForm.file);
      reader.onload = async () => {
        try {
          await documentAPI.uploadKYC({
            type: kycForm.type,
            documentNumber: kycForm.number,
            file: reader.result,
          });
          toast.success('KYC document uploaded successfully');
          setKycForm({ type: 'aadhaar', number: '', file: null });
          setFilePreview(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          fetchKYCDocs();
          fetchProfile();
        } catch (error) {
          toast.error(error.response?.data?.message || 'Failed to upload document');
        } finally {
          setUploadingDoc(false);
        }
      };
      reader.onerror = () => {
        toast.error('Failed to read file');
        setUploadingDoc(false);
      };
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload document');
      setUploadingDoc(false);
    }
  };

  const getKycStatusConfig = (status) => {
    const configs = {
      verified: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: '✓', label: 'Verified' },
      pending: { bg: 'bg-amber-100', text: 'text-amber-700', icon: '⏳', label: 'Pending' },
      submitted: { bg: 'bg-blue-100', text: 'text-blue-700', icon: '📄', label: 'Submitted' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', icon: '✕', label: 'Rejected' },
    };
    return configs[status] || configs.pending;
  };

  const getDocTypeLabel = (type) => {
    const labels = {
      aadhaar: 'Aadhaar Card',
      pan: 'PAN Card',
      voter_id: 'Voter ID',
      driving_license: 'Driving License',
      passport: 'Passport',
      photo: 'Photo',
      signature: 'Signature',
      address_proof: 'Address Proof',
      income_proof: 'Income Proof',
      bank_statement: 'Bank Statement',
    };
    return labels[type] || type;
  };

  const maskNumber = (num, visibleDigits = 4) => {
    if (!num) return '-';
    const str = num.toString();
    if (str.length <= visibleDigits) return str;
    return '*'.repeat(str.length - visibleDigits) + str.slice(-visibleDigits);
  };

  const tabs = [
    { id: 'personal', label: 'Personal Info', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { id: 'kyc', label: 'KYC Documents', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { id: 'address', label: 'Address', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' },
    { id: 'employment', label: 'Employment', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { id: 'bank', label: 'Bank Details', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
  ];

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded-2xl mb-6" />
          <div className="flex gap-2 mb-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 w-28 bg-gray-200 rounded-xl" />
            ))}
          </div>
          <div className="bg-white rounded-2xl p-6 space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const kycStatus = getKycStatusConfig(profile?.kycStatus);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-purple-700 rounded-3xl p-8 text-white relative overflow-hidden animate-scale-in">
        {/* Decorative */}
        <div className="absolute -right-20 -top-20 w-60 h-60 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-20 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center gap-6">
          <div className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shadow-xl">
            <span className="text-white font-bold text-4xl">
              {profile?.fullName?.charAt(0)?.toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{profile?.fullName}</h1>
            <div className="flex flex-wrap items-center gap-4 text-primary-100">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {profile?.phone}
              </span>
              {profile?.email && (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {profile?.email}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 ${kycStatus.bg} ${kycStatus.text}`}>
              <span>{kycStatus.icon}</span>
              KYC {kycStatus.label}
            </span>
            <div className="flex items-center gap-2 text-primary-100 text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              Credit Score: <span className="font-bold text-white">{profile?.creditScore || 50}/100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
            </svg>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm animate-fade-in">
        {/* Personal Info Tab */}
        {activeTab === 'personal' && (
          <div className="p-6">
            <h3 className="font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500 mb-1">Full Name</p>
                <p className="font-semibold text-gray-900">{profile?.fullName}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500 mb-1">Phone Number</p>
                <p className="font-semibold text-gray-900">{profile?.phone}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500 mb-1">Email Address</p>
                <p className="font-semibold text-gray-900">{profile?.email || '-'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500 mb-1">Date of Birth</p>
                <p className="font-semibold text-gray-900">
                  {profile?.dob ? formatDate(profile.dob) : '-'}
                  {profile?.age && <span className="text-gray-500 font-normal"> ({profile.age} years)</span>}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500 mb-1">Gender</p>
                <p className="font-semibold text-gray-900 capitalize">{profile?.gender || '-'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500 mb-1">Customer Since</p>
                <p className="font-semibold text-gray-900">{formatDate(profile?.createdAt)}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-500 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              To update personal information, please contact your loan officer.
            </p>
          </div>
        )}

        {/* KYC Documents Tab */}
        {activeTab === 'kyc' && (
          <div className="p-6">
            <h3 className="font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              KYC Documents
            </h3>

            {/* KYC Status Banner */}
            <div className={`p-4 rounded-xl mb-6 flex items-center gap-4 ${
              profile?.kycStatus === 'verified' ? 'bg-emerald-50' :
              profile?.kycStatus === 'rejected' ? 'bg-red-50' : 'bg-amber-50'
            }`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                profile?.kycStatus === 'verified' ? 'bg-emerald-100' :
                profile?.kycStatus === 'rejected' ? 'bg-red-100' : 'bg-amber-100'
              }`}>
                {profile?.kycStatus === 'verified' ? (
                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ) : profile?.kycStatus === 'rejected' ? (
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div>
                <p className={`font-semibold ${
                  profile?.kycStatus === 'verified' ? 'text-emerald-700' :
                  profile?.kycStatus === 'rejected' ? 'text-red-700' : 'text-amber-700'
                }`}>
                  {profile?.kycStatus === 'verified' ? 'KYC Verified' :
                   profile?.kycStatus === 'rejected' ? 'KYC Rejected' :
                   profile?.kycStatus === 'submitted' ? 'KYC Under Review' : 'KYC Pending'}
                </p>
                <p className="text-sm text-gray-600">
                  {profile?.kycStatus === 'verified' ? 'Your identity has been verified.' :
                   profile?.kycStatus === 'rejected' ? 'Please re-upload your documents.' :
                   profile?.kycStatus === 'submitted' ? 'Your documents are being reviewed.' :
                   'Please submit your KYC documents to apply for loans.'}
                </p>
              </div>
            </div>

            {/* Uploaded Documents */}
            {(kycDocs.length > 0 || (profile?.kycDocs && profile.kycDocs.length > 0)) && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Submitted Documents</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(kycDocs.length > 0 ? kycDocs : profile?.kycDocs || []).map((doc, index) => (
                    <div key={doc._id || index} className="relative group overflow-hidden rounded-xl border border-gray-200 hover:border-primary-300 transition-all">
                      {/* Document Preview */}
                      <div className="relative h-40 bg-gray-100">
                        {doc.filePath ? (
                          doc.filePath.endsWith('.pdf') ? (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-red-50">
                              <svg className="w-12 h-12 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zm-2.5 9.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" />
                              </svg>
                              <span className="mt-2 text-sm font-medium text-red-600">PDF Document</span>
                            </div>
                          ) : (
                            <img
                              src={`/uploads/${doc.filePath}`}
                              alt={doc.type}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ccc"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/></svg>';
                              }}
                            />
                          )
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                        )}
                        {/* Hover overlay with view button */}
                        {doc.filePath && (
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <a
                              href={`/uploads/${doc.filePath}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-white text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-100"
                            >
                              View
                            </a>
                            {!doc.verified && (
                              <button
                                onClick={() => handleDeleteKYC(doc._id)}
                                className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        )}
                        {/* Status badge */}
                        <div className={`absolute top-2 right-2 px-2 py-1 rounded-lg text-xs font-semibold ${
                          doc.verified ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                        }`}>
                          {doc.verified ? 'Verified' : 'Pending'}
                        </div>
                      </div>
                      {/* Document info */}
                      <div className="p-3 bg-white">
                        <p className="font-medium text-gray-900 text-sm">{getDocTypeLabel(doc.type)}</p>
                        {doc.documentNumber && (
                          <p className="text-xs text-gray-500 mt-0.5">{maskNumber(doc.documentNumber || doc.number, 4)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload New Document */}
            {profile?.kycStatus !== 'verified' && (
              <div className="border-t border-gray-100 pt-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-4">Upload New Document</h4>
                <form onSubmit={handleUploadKyc} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Document Type</label>
                      <select
                        value={kycForm.type}
                        onChange={(e) => setKycForm({ ...kycForm, type: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:bg-white transition-all"
                      >
                        <option value="aadhaar">Aadhaar Card</option>
                        <option value="pan">PAN Card</option>
                        <option value="voter_id">Voter ID</option>
                        <option value="driving_license">Driving License</option>
                        <option value="passport">Passport</option>
                        <option value="bank_statement">Bank Statement</option>
                        <option value="salary_slip">Salary Slip</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Document Number (Optional)</label>
                      <input
                        type="text"
                        value={kycForm.number}
                        onChange={(e) => setKycForm({ ...kycForm, number: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:bg-white transition-all"
                        placeholder="Enter document number"
                      />
                    </div>
                  </div>

                  {/* File Upload Area */}
                  <div
                    className={`relative border-2 border-dashed rounded-xl transition-all ${
                      dragActive
                        ? 'border-primary-500 bg-primary-50'
                        : filePreview
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={(e) => handleFileSelect(e.target.files[0])}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />

                    {filePreview ? (
                      <div className="p-4">
                        <div className="flex items-start gap-4">
                          {/* Preview */}
                          <div className="w-32 h-32 rounded-lg overflow-hidden bg-white border border-gray-200 flex-shrink-0">
                            {filePreview === 'pdf' ? (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-red-50">
                                <svg className="w-10 h-10 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4z" />
                                </svg>
                                <span className="mt-1 text-xs font-medium text-red-600">PDF</span>
                              </div>
                            ) : (
                              <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
                            )}
                          </div>
                          {/* File info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{kycForm.file?.name}</p>
                            <p className="text-sm text-gray-500 mt-1">
                              {(kycForm.file?.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                clearFileSelection();
                              }}
                              className="mt-3 px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                            >
                              Remove File
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-primary-100 rounded-2xl flex items-center justify-center">
                          <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <p className="text-gray-900 font-medium mb-1">
                          {dragActive ? 'Drop your file here' : 'Drag and drop your document'}
                        </p>
                        <p className="text-sm text-gray-500 mb-3">or click to browse</p>
                        <p className="text-xs text-gray-400">Supports: JPG, PNG, PDF (Max 5MB)</p>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={uploadingDoc || !kycForm.file}
                    className="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-xl shadow-lg shadow-primary-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {uploadingDoc ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Upload Document
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Address Tab */}
        {activeTab === 'address' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                </div>
                Address Details
              </h3>
              {editing !== 'address' && (
                <button
                  onClick={() => setEditing('address')}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
              )}
            </div>

            {editing === 'address' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
                  <input
                    type="text"
                    value={addressForm.street}
                    onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:bg-white transition-all"
                    placeholder="House/Flat No., Street Name, Area, Landmark"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                    <input
                      type="text"
                      value={addressForm.city}
                      onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:bg-white transition-all"
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                    <input
                      type="text"
                      value={addressForm.state}
                      onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:bg-white transition-all"
                      placeholder="State"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Pincode</label>
                    <input
                      type="text"
                      value={addressForm.pincode}
                      onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:bg-white transition-all"
                      placeholder="Pincode"
                      maxLength={6}
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setEditing(null)}
                    className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAddress}
                    disabled={saving}
                    className="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-xl shadow-lg shadow-primary-500/30 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5 bg-gray-50 rounded-xl">
                <p className="text-gray-900">
                  {profile?.fullAddress || profile?.address?.street ? (
                    <>
                      {profile?.address?.street && <span>{profile.address.street}</span>}
                      {profile?.address?.city && <span>, {profile.address.city}</span>}
                      {profile?.address?.state && <span>, {profile.address.state}</span>}
                      {profile?.address?.pincode && <span> - {profile.address.pincode}</span>}
                    </>
                  ) : (
                    <span className="text-gray-500">No address added yet</span>
                  )}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Employment Tab */}
        {activeTab === 'employment' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                Employment Details
              </h3>
              {editing !== 'employment' && (
                <button
                  onClick={() => setEditing('employment')}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
              )}
            </div>

            {editing === 'employment' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Employment Type</label>
                    <select
                      value={employmentForm.employmentType}
                      onChange={(e) => setEmploymentForm({ ...employmentForm, employmentType: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:bg-white transition-all"
                    >
                      <option value="">Select Type</option>
                      <option value="salaried">Salaried</option>
                      <option value="self_employed">Self Employed</option>
                      <option value="business">Business Owner</option>
                      <option value="professional">Professional</option>
                      <option value="retired">Retired</option>
                      <option value="student">Student</option>
                      <option value="homemaker">Homemaker</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Employer/Business Name</label>
                    <input
                      type="text"
                      value={employmentForm.employerName}
                      onChange={(e) => setEmploymentForm({ ...employmentForm, employerName: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:bg-white transition-all"
                      placeholder="Company/Business name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Designation</label>
                    <input
                      type="text"
                      value={employmentForm.designation}
                      onChange={(e) => setEmploymentForm({ ...employmentForm, designation: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:bg-white transition-all"
                      placeholder="Your role/designation"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Income (₹)</label>
                    <input
                      type="number"
                      value={employmentForm.monthlyIncome}
                      onChange={(e) => setEmploymentForm({ ...employmentForm, monthlyIncome: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:bg-white transition-all"
                      placeholder="Monthly income"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Work Experience (Years)</label>
                    <input
                      type="number"
                      value={employmentForm.workExperience}
                      onChange={(e) => setEmploymentForm({ ...employmentForm, workExperience: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:bg-white transition-all"
                      placeholder="Years of experience"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setEditing(null)}
                    className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEmployment}
                    disabled={saving}
                    className="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-xl shadow-lg shadow-primary-500/30 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">Employment Type</p>
                  <p className="font-semibold text-gray-900 capitalize">{profile?.employmentType?.replace('_', ' ') || '-'}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">Employer/Business</p>
                  <p className="font-semibold text-gray-900">{profile?.employerName || '-'}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">Designation</p>
                  <p className="font-semibold text-gray-900">{profile?.designation || '-'}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">Monthly Income</p>
                  <p className="font-semibold text-gray-900">{formatCurrency(profile?.monthlyIncome)}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">Work Experience</p>
                  <p className="font-semibold text-gray-900">{profile?.workExperience ? `${profile.workExperience} years` : '-'}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bank Details Tab */}
        {activeTab === 'bank' && (
          <div className="p-6">
            <h3 className="font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              Bank Details
            </h3>

            {profile?.bankDetails?.bankName ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">Bank Name</p>
                  <p className="font-semibold text-gray-900">{profile.bankDetails.bankName}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">Account Number</p>
                  <p className="font-semibold text-gray-900 font-mono">{maskNumber(profile.bankDetails.accountNumber, 4)}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">IFSC Code</p>
                  <p className="font-semibold text-gray-900 font-mono">{profile.bankDetails.ifscCode}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">Account Type</p>
                  <p className="font-semibold text-gray-900 capitalize">{profile.bankDetails.accountType}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <p className="text-gray-500">No bank details added yet</p>
                <p className="text-sm text-gray-400 mt-1">Contact your loan officer to add bank details</p>
              </div>
            )}

            <p className="mt-6 text-sm text-gray-500 flex items-center gap-2 p-4 bg-amber-50 rounded-xl">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              For security reasons, bank details can only be updated by your loan officer.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerProfile;
