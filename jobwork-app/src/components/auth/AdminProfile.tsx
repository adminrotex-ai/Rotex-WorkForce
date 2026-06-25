import { useState, useRef, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../store';
import { setUser } from '../../store/slices/authSlice';
import { db } from '../../database/db';
import {
  updateAdminUsername, updateAdminPassword, updateAdminProfilePicture,
} from '../../database/operations';
import Modal from '../common/Modal';
import { Camera, ImageIcon, X, KeyRound, UserCog, RefreshCw, ShieldCheck } from 'lucide-react';

const CAPTCHA_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CAPTCHA_LENGTH = 6;

function generateCaptchaText(): string {
  let text = '';
  const arr = new Uint32Array(CAPTCHA_LENGTH);
  crypto.getRandomValues(arr);
  for (let i = 0; i < CAPTCHA_LENGTH; i++) {
    text += CAPTCHA_CHARS[arr[i] % CAPTCHA_CHARS.length];
  }
  return text;
}

function drawCaptcha(canvas: HTMLCanvasElement, text: string) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = '#f8f5ee';
  ctx.fillRect(0, 0, w, h);

  const randInt = (min: number, max: number) => {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return min + (arr[0] % (max - min + 1));
  };

  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = `hsl(${randInt(0, 360)}, 30%, 75%)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(randInt(0, w), randInt(0, h));
    ctx.bezierCurveTo(randInt(0, w), randInt(0, h), randInt(0, w), randInt(0, h), randInt(0, w), randInt(0, h));
    ctx.stroke();
  }

  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = `hsl(${randInt(0, 360)}, 20%, 70%)`;
    ctx.fillRect(randInt(0, w), randInt(0, h), 2, 2);
  }

  const charWidth = w / (text.length + 1);
  for (let i = 0; i < text.length; i++) {
    ctx.save();
    const x = charWidth * (i + 0.5) + randInt(-2, 2);
    const y = h / 2 + randInt(-4, 4);
    const angle = ((randInt(-25, 25)) * Math.PI) / 180;
    ctx.translate(x, y);
    ctx.rotate(angle);
    const size = randInt(22, 28);
    ctx.font = `bold ${size}px monospace`;
    ctx.fillStyle = `hsl(${randInt(0, 360)}, 60%, 35%)`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text[i], 0, 0);
    ctx.restore();
  }

  for (let i = 0; i < 2; i++) {
    ctx.strokeStyle = `hsl(${randInt(0, 360)}, 40%, 55%)`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(randInt(0, 20), randInt(10, h - 10));
    ctx.lineTo(w - randInt(0, 20), randInt(10, h - 10));
    ctx.stroke();
  }
}

function useCaptcha() {
  const [captchaText, setCaptchaText] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const regenerate = useCallback(() => {
    const text = generateCaptchaText();
    setCaptchaText(text);
    return text;
  }, []);

  useEffect(() => {
    if (captchaText && canvasRef.current) {
      drawCaptcha(canvasRef.current, captchaText);
    }
  }, [captchaText]);

  const verify = useCallback((input: string): boolean => {
    if (!captchaText || !input) return false;
    return input.toUpperCase().trim() === captchaText;
  }, [captchaText]);

  return { canvasRef, regenerate, verify, captchaText };
}

export default function AdminProfile() {
  const { currentUser } = useSelector((s: RootState) => s.auth);
  const dispatch = useDispatch();

  const [profilePicture, setProfilePicture] = useState(currentUser?.profilePicture || '');
  const [showChangeUsername, setShowChangeUsername] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [usernameForm, setUsernameForm] = useState({ newUsername: '', currentPassword: '', specialPassword: '', captchaInput: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '', specialPassword: '', captchaInput: '' });

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const usernameCaptcha = useCaptcha();
  const passwordCaptcha = useCaptcha();

  if (!currentUser || currentUser.role !== 'admin') return null;

  const handleImageFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setError('Image too large (max 5 MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const pic = ev.target?.result as string;
      try {
        await updateAdminProfilePicture(currentUser.id, pic);
        setProfilePicture(pic);
        const updated = await db.users.get(currentUser.id);
        if (updated) dispatch(setUser(updated));
        setSuccess('Profile picture updated');
        setTimeout(() => setSuccess(''), 3000);
      } catch (e: any) { setError(e.message); }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePicture = async () => {
    try {
      await updateAdminProfilePicture(currentUser.id, undefined);
      setProfilePicture('');
      const updated = await db.users.get(currentUser.id);
      if (updated) dispatch(setUser(updated));
      setSuccess('Profile picture removed');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) { setError(e.message); }
  };

  const openUsernameModal = () => {
    setShowChangeUsername(true);
    setError('');
    setUsernameForm({ newUsername: '', currentPassword: '', specialPassword: '', captchaInput: '' });
    setTimeout(() => usernameCaptcha.regenerate(), 50);
  };

  const openPasswordModal = () => {
    setShowChangePassword(true);
    setError('');
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '', specialPassword: '', captchaInput: '' });
    setTimeout(() => passwordCaptcha.regenerate(), 50);
  };

  const handleChangeUsername = async () => {
    setError('');
    if (!usernameForm.newUsername.trim()) { setError('New username is required'); return; }
    if (!usernameForm.currentPassword) { setError('Current password is required'); return; }
    if (!usernameForm.specialPassword) { setError('Special password is required'); return; }
    if (!usernameForm.captchaInput) { setError('Please enter the CAPTCHA'); return; }
    if (!usernameCaptcha.verify(usernameForm.captchaInput)) {
      setError('CAPTCHA verification failed');
      usernameCaptcha.regenerate();
      setUsernameForm(f => ({ ...f, captchaInput: '' }));
      return;
    }
    try {
      await updateAdminUsername(currentUser.id, usernameForm.newUsername.trim(), usernameForm.currentPassword, usernameForm.specialPassword);
      const updated = await db.users.get(currentUser.id);
      if (updated) dispatch(setUser(updated));
      setShowChangeUsername(false);
      setSuccess('Username updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e.message);
      usernameCaptcha.regenerate();
      setUsernameForm(f => ({ ...f, captchaInput: '' }));
    }
  };

  const handleChangePassword = async () => {
    setError('');
    if (!passwordForm.currentPassword) { setError('Current password is required'); return; }
    if (!passwordForm.newPassword) { setError('New password is required'); return; }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { setError('New passwords do not match'); return; }
    if (passwordForm.newPassword.length < 4) { setError('New password must be at least 4 characters'); return; }
    if (!passwordForm.specialPassword) { setError('Special password is required'); return; }
    if (!passwordForm.captchaInput) { setError('Please enter the CAPTCHA'); return; }
    if (!passwordCaptcha.verify(passwordForm.captchaInput)) {
      setError('CAPTCHA verification failed');
      passwordCaptcha.regenerate();
      setPasswordForm(f => ({ ...f, captchaInput: '' }));
      return;
    }
    try {
      await updateAdminPassword(currentUser.id, passwordForm.currentPassword, passwordForm.newPassword, passwordForm.specialPassword);
      setShowChangePassword(false);
      setSuccess('Password updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e.message);
      passwordCaptcha.regenerate();
      setPasswordForm(f => ({ ...f, captchaInput: '' }));
    }
  };

  const renderCaptchaBlock = (
    captcha: ReturnType<typeof useCaptcha>,
    inputValue: string,
    onChange: (val: string) => void,
  ) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">CAPTCHA Verification *</label>
      <div className="flex items-center gap-3">
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
          <canvas ref={captcha.canvasRef} width={200} height={50} />
        </div>
        <button
          type="button"
          onClick={() => { captcha.regenerate(); onChange(''); }}
          className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 cursor-pointer"
          title="New CAPTCHA"
        >
          <RefreshCw size={18} />
        </button>
      </div>
      <input
        type="text"
        value={inputValue}
        onChange={e => onChange(e.target.value.toUpperCase())}
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-gold-400"
        placeholder="Enter the characters above"
        autoComplete="off"
      />
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-light text-gray-900">Admin Profile</h1>
          <p className="text-sm text-gray-400 mt-1">Manage your account settings</p>
        </div>
      </div>

      {success && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 flex items-center gap-2">
          <ShieldCheck size={16} /> {success}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Picture */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Profile Picture</h2>
          <div className="flex items-center gap-5">
            {profilePicture ? (
              <div className="relative">
                <img src={profilePicture} alt="Admin" className="w-24 h-24 rounded-2xl object-cover" />
                <button
                  onClick={handleRemovePicture}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-gold-300 flex items-center justify-center text-dark-800 font-bold text-3xl">
                {currentUser.firstName?.[0] || 'A'}
              </div>
            )}
            <div className="flex flex-col gap-2">
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); e.target.value = ''; }}
              />
              <input
                ref={galleryRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); e.target.value = ''; }}
              />
              <button
                onClick={() => cameraRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-white/60 cursor-pointer"
              >
                <Camera size={16} /> Take Photo
              </button>
              <button
                onClick={() => galleryRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-white/60 cursor-pointer"
              >
                <ImageIcon size={16} /> Choose from Gallery
              </button>
            </div>
          </div>
          {error && !showChangeUsername && !showChangePassword && (
            <p className="text-red-500 text-sm mt-3 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
        </div>

        {/* Account Settings */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Account Settings</h2>
          <div className="space-y-4">
            <div className="p-4 border border-gray-100 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Username</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{currentUser.username}</p>
                </div>
                <button
                  onClick={openUsernameModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2a2a2a] text-white text-[11px] font-medium rounded-full hover:bg-[#1a1a1a] cursor-pointer"
                >
                  <UserCog size={12} /> Change
                </button>
              </div>
            </div>
            <div className="p-4 border border-gray-100 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Password</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">••••••••</p>
                </div>
                <button
                  onClick={openPasswordModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2a2a2a] text-white text-[11px] font-medium rounded-full hover:bg-[#1a1a1a] cursor-pointer"
                >
                  <KeyRound size={12} /> Change
                </button>
              </div>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-[11px] text-amber-700">
              Changing username or password requires your current password, a special password, and CAPTCHA verification.
            </div>
          </div>
        </div>
      </div>

      {/* Change Username Modal */}
      <Modal isOpen={showChangeUsername} onClose={() => { setShowChangeUsername(false); setError(''); }} title="Change Username" maxWidth="28rem">
        <div className="space-y-4">
          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Username *</label>
            <input
              type="text"
              value={usernameForm.newUsername}
              onChange={e => setUsernameForm({ ...usernameForm, newUsername: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              placeholder="Enter new username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password *</label>
            <input
              type="password"
              value={usernameForm.currentPassword}
              onChange={e => setUsernameForm({ ...usernameForm, currentPassword: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              placeholder="Enter current password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Special Password *</label>
            <input
              type="password"
              value={usernameForm.specialPassword}
              onChange={e => setUsernameForm({ ...usernameForm, specialPassword: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              placeholder="Enter special password"
            />
          </div>
          {renderCaptchaBlock(
            usernameCaptcha,
            usernameForm.captchaInput,
            val => setUsernameForm(f => ({ ...f, captchaInput: val })),
          )}
          <button
            onClick={handleChangeUsername}
            className="w-full bg-[#2a2a2a] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#1a1a1a] cursor-pointer"
          >
            Update Username
          </button>
        </div>
      </Modal>

      {/* Change Password Modal */}
      <Modal isOpen={showChangePassword} onClose={() => { setShowChangePassword(false); setError(''); }} title="Change Password" maxWidth="28rem">
        <div className="space-y-4">
          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password *</label>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              placeholder="Enter current password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password *</label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              placeholder="Enter new password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password *</label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              placeholder="Confirm new password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Special Password *</label>
            <input
              type="password"
              value={passwordForm.specialPassword}
              onChange={e => setPasswordForm({ ...passwordForm, specialPassword: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              placeholder="Enter special password"
            />
          </div>
          {renderCaptchaBlock(
            passwordCaptcha,
            passwordForm.captchaInput,
            val => setPasswordForm(f => ({ ...f, captchaInput: val })),
          )}
          <button
            onClick={handleChangePassword}
            className="w-full bg-[#2a2a2a] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#1a1a1a] cursor-pointer"
          >
            Update Password
          </button>
        </div>
      </Modal>
    </div>
  );
}
