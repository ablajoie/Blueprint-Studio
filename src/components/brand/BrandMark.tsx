type BrandMarkSize = 'small' | 'medium' | 'large'

const sizeClass: Record<BrandMarkSize, string> = {
  small: 'size-8 rounded-lg',
  medium: 'size-9 rounded-lg',
  large: 'size-16 rounded-2xl',
}

const strokeClass: Record<BrandMarkSize, string> = {
  small: 'border-2',
  medium: 'border-[2.5px]',
  large: 'border-[3px]',
}

export function BrandMark({
  size = 'medium',
  className = '',
}: {
  size?: BrandMarkSize
  className?: string
}) {
  const stroke = strokeClass[size]

  return (
    <span
      aria-hidden="true"
      className={`relative inline-block shrink-0 overflow-hidden bg-[#0B2341] shadow-sm ring-1 ring-inset ring-[#22C7D6]/40 ${sizeClass[size]} ${className}`}
    >
      <span className="absolute bottom-[17%] left-[25%] top-[17%] w-[9%] rounded-full bg-[#22C7D6]" />
      <span
        className={`absolute left-[30%] top-[17%] h-[33%] w-[43%] rounded-r-full border-l-0 border-white ${stroke}`}
      />
      <span
        className={`absolute bottom-[17%] left-[30%] h-[38%] w-[50%] rounded-r-full border-l-0 border-white ${stroke}`}
      />
      <span className="absolute left-[21%] top-[14%] size-[16%] rounded-full bg-[#2F6FED] ring-1 ring-[#8AE8F0]" />
    </span>
  )
}
