import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import { RoleIcon } from './roleIcons'

// Curated high-performance lightweight medical Lottie animations
const LOTTIE_URLS = {
  // Patient / Heart pulse
  patient: 'https://lottie.host/80e922f3-18aa-4752-965a-c9ba6b610c37/lW8k1sR8r8.lottie',
  // Doctor / Stethoscope
  doctor: 'https://lottie.host/9806411f-f432-446a-8b17-a0684f86d634/Nf5hH4eHau.lottie',
  // Pharmacy / Medicine
  pharmacy: 'https://lottie.host/a8b98b0f-ff91-49a8-9d29-a1d2f2d93e7f/6dY60F4rW5.lottie',
  // Lab Technician / Flask
  lab: 'https://lottie.host/7e0078b6-3aa6-41fb-a14f-37ec42a0b129/6M2m8G28x3.lottie',
  // Hospital / Clinic
  hospital: 'https://lottie.host/c50c028c-0975-4d2c-88e2-c4e970b80695/9E09d0zB1q.lottie',
  // Super Admin / Shield Security
  crown: 'https://lottie.host/5bcf82f1-c466-41e9-918d-f5e6a3949f25/f83y7R89bA.lottie',
}

export default function LottieIcon({ name, size = 42, fallbackSize = 24, className = '' }) {
  const url = LOTTIE_URLS[name]

  return (
    <div
      className={`lottie-icon-wrapper ${className}`}
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      {url ? (
        <DotLottieReact
          src={url}
          loop
          autoplay
          style={{ width: '100%', height: '100%' }}
        />
      ) : (
        <RoleIcon name={name} size={fallbackSize} />
      )}
    </div>
  )
}
