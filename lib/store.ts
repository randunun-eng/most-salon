import { create } from 'zustand';
import { Service, Branch, Stylist } from './data';

interface BookingState {
    step: number;
    selectedBranch: Branch | null;
    selectedService: Service | null;
    selectedStylist: Stylist | null;
    selectedDate: Date | null;
    selectedTime: string | null;
    clientName: string;
    clientPhone: string;

    setStep: (step: number) => void;
    setBranch: (branch: Branch) => void;
    setService: (service: Service) => void;
    setStylist: (stylist: Stylist) => void;
    setDate: (date: Date) => void;
    setTime: (time: string) => void;
    setClientName: (name: string) => void;
    setClientPhone: (phone: string) => void;
    reset: () => void;
}

export const useBookingStore = create<BookingState>((set) => ({
    step: 1,
    selectedBranch: null,
    selectedService: null,
    selectedStylist: null,
    selectedDate: null,
    selectedTime: null,
    clientName: "",
    clientPhone: "",

    setStep: (step) => set({ step }),
    setBranch: (branch) => set({ selectedBranch: branch }),
    setService: (service) => set({ selectedService: service }),
    setStylist: (stylist) => set({ selectedStylist: stylist }),
    setDate: (date) => set({ selectedDate: date }),
    setTime: (time) => set({ selectedTime: time }),
    setClientName: (name) => set({ clientName: name }),
    setClientPhone: (phone) => set({ clientPhone: phone }),
    reset: () => set({
        step: 1,
        selectedBranch: null,
        selectedService: null,
        selectedStylist: null,
        selectedDate: null,
        selectedTime: null,
        clientName: "",
        clientPhone: ""
    }),
}));
