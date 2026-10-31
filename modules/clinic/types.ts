export type Status =
  "pending" | "confirmed" | "declined" | "cancelled" | "completed" | "no_show";
export type Service = {
  id: string;
  name: string;
  description: string;
  duration: number | null;
  active: boolean;
};
export type Settings = {
  days: number[];
  sessions: { start: string; end: string }[];
  interval: number;
  capacity: number;
  holdMinutes: number;
  cancellationHours: number;
  retentionDays: number;
  blocked: { date: string; start?: string; end?: string }[];
  phone: string;
  address: string;
  bio: string;
  whatsapp: boolean;
  eveningProvisional: boolean;
  photos: { id: string; alt: string; data: string }[];
};
export type Appointment = {
  id: string;
  reference: string;
  tokenHash: string;
  idempotency: string;
  fingerprint: string;
  name: string;
  phone: string;
  service: string;
  date: string;
  time: string;
  duration: number;
  status: Status;
  note: string;
  internalNote: string;
  createdAt: number;
  holdUntil: number;
  updatedAt: number;
};
export type Staff = {
  id: string;
  email: string;
  name: string;
  role: "administrator" | "receptionist";
  passwordHash: string;
  active: boolean;
};
export type Session = { hash: string; staffId: string; expires: number };
export type Enquiry = {
  id: string;
  name: string;
  phone: string;
  message: string;
  status: "new" | "resolved";
  createdAt: number;
};
export type Audit = {
  id: string;
  actor: string;
  action: string;
  target: string;
  at: number;
};
export type State = {
  settings: Settings;
  services: Service[];
  appointments: Appointment[];
  staff: Staff[];
  sessions: Session[];
  enquiries: Enquiry[];
  audit: Audit[];
  limits: Record<string, { count: number; until: number }>;
  notifications: {
    id: string;
    appointmentId: string;
    status: string;
    attempts: number;
    updatedAt: number;
    lastError?: string;
    leaseUntil?: number;
  }[];
};
export const initialState = (): State => ({
  settings: {
    days: [],
    sessions: [
      { start: "09:00", end: "12:00" },
      { start: "15:00", end: "20:00" },
    ],
    interval: 15,
    capacity: 1,
    holdMinutes: 120,
    cancellationHours: 0,
    retentionDays: 180,
    blocked: [],
    phone: "+923003032956",
    address:
      "Near Admore Petroleum Pump, Old Bypass, Bhan Syedabad, Sindh, Pakistan.",
    bio: "",
    whatsapp: false,
    eveningProvisional: true,
    photos: [],
  },
  services: [
    {
      id: "ultrasound",
      name: "Digital Ultrasound",
      description:
        "Digital ultrasound services at the clinic. Contact the clinic to discuss your appointment and any preparation requirements.",
      duration: null,
      active: true,
    },
    {
      id: "physiotherapy",
      name: "Physiotherapy",
      description:
        "Physiotherapy care with Dr. Komal Awais. Discuss your needs with the clinic to arrange a visit.",
      duration: null,
      active: true,
    },
    {
      id: "joint-pain",
      name: "Joint Pain",
      description:
        "Arrange a clinic visit to discuss joint pain and suitable physiotherapy care.",
      duration: null,
      active: true,
    },
    {
      id: "muscle-pain",
      name: "Muscle Pain & Spasms",
      description: "Contact the clinic about care for muscle pain and spasms.",
      duration: null,
      active: true,
    },
    {
      id: "injury",
      name: "Injury Rehabilitation",
      description:
        "Physiotherapy care for injuries. Contact the clinic to discuss suitability and arrange a visit.",
      duration: null,
      active: true,
    },
  ],
  appointments: [],
  staff: [],
  sessions: [],
  enquiries: [],
  audit: [],
  limits: {},
  notifications: [],
});
