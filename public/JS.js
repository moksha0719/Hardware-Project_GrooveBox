// ITM-G03-P3 Hardware Groovebox Controller
class HardwareGroovebox {
    constructor() {
        this.isPlaying = false;
        this.isRecording = false;
        this.bpm = 120;
        this.currentStep = 0;
        this.sequencerInterval = null;
        this.audioContext = null;
        this.oscillators = {};
        this.knobValues = {};
        this.modules = {
            synth: { connected: true, type: 'Module 1: Synth/Vocoder' },
            drums: { connected: true, type: 'Module 2: Drum Sampler' },
            modulation: { connected: true, type: 'Module 3: Modulation Panel' },
            master: { connected: true, type: 'Module 4: Master Control' },
            mixer: { connected: true, type: 'Module 5: Mixer & Scope' }
        };
        
        // BACKEND CONNECTION
        this.socket = null;
        
        this.init();
        this.connectToBackend();
    }

    // ADD THIS METHOD FOR BACKEND
    connectToBackend() {
        try {
            this.socket = io();
            
            this.socket.on('connect', () => {
                console.log('✅ Connected to backend server');
                if (document.getElementById('wsStatus')) {
                    document.getElementById('wsStatus').textContent = 'SERVER: Connected';
                }
            });
            
            this.socket.on('patternUpdated', (pattern) => {
                console.log('Pattern updated from server:', pattern.name);
            });
            
            this.socket.on('patternLoaded', (pattern) => {
                console.log('Pattern loaded from server:', pattern.name);
                this.applyPattern(pattern);
            });
            
            this.socket.on('disconnect', () => {
                console.log('❌ Disconnected from server');
                if (document.getElementById('wsStatus')) {
                    document.getElementById('wsStatus').textContent = 'SERVER: Disconnected';
                }
            });
            
        } catch (error) {
            console.log('Backend server not available, running in standalone mode');
        }
    }

    applyPattern(pattern) {
        // Apply pattern data to the sequencer
        if (pattern.steps && pattern.steps.length > 0) {
            const steps = document.querySelectorAll('.step');
            pattern.steps.forEach((active, index) => {
                if (index < steps.length) {
                    if (active) {
                        steps[index].classList.add('active');
                    } else {
                        steps[index].classList.remove('active');
                    }
                }
            });
        }
    }

    init() {
        this.createSequencer();
        this.createPiano();
        this.setupEventListeners();
        this.setupKnobs();
        this.setupFaders();
        this.updateBPM();
        this.simulateHardwareConnection();
    }

    // Hardware simulation
    simulateHardwareConnection() {
        console.log('ITM-G03-P3 Hardware Groovebox Initialized');
        console.log('Modules Detected:');
        Object.entries(this.modules).forEach(([name, module]) => {
            console.log(`- ${module.type}: ${module.connected ? 'CONNECTED' : 'DISCONNECTED'}`);
        });
        
        // Simulate I2C communication
        setInterval(() => {
            this.updateModuleStatus();
        }, 3000);
    }

    updateModuleStatus() {
        const statusElement = document.getElementById('cpuStatus');
        if (statusElement) {
            const randomLoad = Math.floor(Math.random() * 30) + 10;
            statusElement.textContent = `DSP: ${randomLoad}%`;
        }
    }

    // Sequencer functionality
    createSequencer() {
        const stepGrid = document.getElementById('stepGrid');
        if (!stepGrid) return;
        
        stepGrid.innerHTML = '';
        
        for (let i = 0; i < 16; i++) {
            const step = document.createElement('div');
            step.className = 'step';
            step.dataset.step = i + 1;
            step.addEventListener('click', () => this.toggleStep(step));
            stepGrid.appendChild(step);
        }
    }

    toggleStep(step) {
        step.classList.toggle('active');
        this.sendStepUpdate(step);
    }

    sendStepUpdate(step) {
        // Simulate sending step data to hardware via I2C
        const stepNum = parseInt(step.dataset.step);
        const active = step.classList.contains('active');
        console.log(`I2C: Step ${stepNum} ${active ? 'ACTIVATED' : 'DEACTIVATED'}`);
        
        // Send to backend if connected
        if (this.socket && this.socket.connected) {
            this.socket.emit('stepUpdate', { step: stepNum, active: active });
        }
    }

    startSequencer() {
        if (this.isPlaying) return;
        
        this.isPlaying = true;
        const playBtn = document.getElementById('playBtn');
        if (playBtn) playBtn.classList.add('active');
        this.currentStep = 0;
        
        const stepInterval = (60 / this.bpm) * 1000 / 4;
        
        this.sequencerInterval = setInterval(() => {
            this.updateSequencer();
        }, stepInterval);
        
        console.log('Sequencer STARTED - I2C clock running');
        
        // Notify backend
        if (this.socket && this.socket.connected) {
            this.socket.emit('transport', { action: 'play', bpm: this.bpm });
        }
    }

    stopSequencer() {
        this.isPlaying = false;
        const playBtn = document.getElementById('playBtn');
        const recBtn = document.getElementById('recBtn');
        if (playBtn) playBtn.classList.remove('active');
        if (recBtn) recBtn.classList.remove('active');
        this.isRecording = false;
        
        if (this.sequencerInterval) {
            clearInterval(this.sequencerInterval);
            this.sequencerInterval = null;
        }
        
        document.querySelectorAll('.step.playing').forEach(step => {
            step.classList.remove('playing');
        });
        
        console.log('Sequencer STOPPED - I2C clock halted');
        
        // Notify backend
        if (this.socket && this.socket.connected) {
            this.socket.emit('transport', { action: 'stop' });
        }
    }

    updateSequencer() {
        const steps = document.querySelectorAll('.step');
        if (steps.length === 0) return;
        
        if (this.currentStep > 0) {
            steps[this.currentStep - 1].classList.remove('playing');
        } else {
            steps[steps.length - 1].classList.remove('playing');
        }
        
        steps[this.currentStep].classList.add('playing');
        
        if (steps[this.currentStep].classList.contains('active')) {
            this.playStepSound();
            this.sendTriggerToHardware(this.currentStep);
        }
        
        this.currentStep = (this.currentStep + 1) % steps.length;
    }

    sendTriggerToHardware(step) {
        // Simulate sending trigger to hardware modules
        const drumTypes = ['KICK', 'SNARE', 'HIHAT', 'CLAP'];
        const drumType = drumTypes[step % drumTypes.length];
        console.log(`I2C TRIGGER: Step ${step + 1} -> ${drumType}`);
        
        // Send to backend
        if (this.socket && this.socket.connected) {
            this.socket.emit('trigger', { step: step + 1, type: drumType });
        }
    }

    playStepSound() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = 200 + Math.random() * 800;
        oscillator.type = 'square';
        
        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.1);
    }

    // Piano functionality
    createPiano() {
        const piano = document.getElementById('piano');
        if (!piano) return;
        
        const notes = [
            { note: 'C', type: 'white' }, { note: 'C#', type: 'black' },
            { note: 'D', type: 'white' }, { note: 'D#', type: 'black' },
            { note: 'E', type: 'white' }, { note: 'F', type: 'white' },
            { note: 'F#', type: 'black' }, { note: 'G', type: 'white' },
            { note: 'G#', type: 'black' }, { note: 'A', type: 'white' },
            { note: 'A#', type: 'black' }, { note: 'B', type: 'white' }
        ];
        
        piano.innerHTML = '';
        
        notes.forEach((note, index) => {
            const key = document.createElement('div');
            key.className = `key ${note.type}`;
            key.dataset.note = note.note;
            key.dataset.frequency = this.getNoteFrequency(index);
            
            key.addEventListener('mousedown', () => this.playPianoNote(key, true));
            key.addEventListener('mouseup', () => this.playPianoNote(key, false));
            key.addEventListener('mouseleave', () => this.playPianoNote(key, false));
            
            piano.appendChild(key);
        });
    }

    getNoteFrequency(index) {
        return 220 * Math.pow(2, index / 12);
    }

    playPianoNote(key, isPressed) {
        if (isPressed) {
            key.classList.add('pressed');
            this.playNote(parseFloat(key.dataset.frequency));
            console.log(`MIDI: Note ON - ${key.dataset.note} (${key.dataset.frequency}Hz)`);
            
            // Send to backend
            if (this.socket && this.socket.connected) {
                this.socket.emit('midi', { 
                    type: 'noteOn', 
                    note: key.dataset.note, 
                    frequency: key.dataset.frequency 
                });
            }
        } else {
            key.classList.remove('pressed');
            this.stopNote(parseFloat(key.dataset.frequency));
            console.log(`MIDI: Note OFF - ${key.dataset.note}`);
            
            // Send to backend
            if (this.socket && this.socket.connected) {
                this.socket.emit('midi', { 
                    type: 'noteOff', 
                    note: key.dataset.note 
                });
            }
        }
    }

    playNote(frequency) {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sawtooth';
        
        filter.type = 'lowpass';
        filter.frequency.value = 1000;
        
        gainNode.gain.value = 0.2;
        
        oscillator.start();
        this.oscillators[frequency] = { oscillator, gainNode, filter };
    }

    stopNote(frequency) {
        if (this.oscillators[frequency]) {
            this.oscillators[frequency].gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
            this.oscillators[frequency].oscillator.stop(this.audioContext.currentTime + 0.5);
            delete this.oscillators[frequency];
        }
    }

    // Knob functionality
    setupKnobs() {
        document.querySelectorAll('.knob').forEach(knob => {
            const valueDisplay = knob.parentElement.querySelector('.value-display');
            const indicator = knob.querySelector('.indicator');
            const initialValue = 0.5;
            
            this.knobValues[this.getKnobId(knob)] = initialValue;
            this.updateKnobDisplay(knob, initialValue, valueDisplay, indicator);
            
            knob.addEventListener('mousedown', (e) => this.startKnobDrag(e, knob, valueDisplay, indicator));
        });
    }

    getKnobId(knob) {
        const osc = knob.dataset.osc;
        const param = knob.dataset.param;
        const fx = knob.dataset.fx;
        
        if (fx) {
            return `fx_${fx}_${param}`;
        }
        return `osc_${osc}_${param}`;
    }

    startKnobDrag(e, knob, valueDisplay, indicator) {
        e.preventDefault();
        const startY = e.clientY;
        const startValue = this.knobValues[this.getKnobId(knob)];
        
        const onMouseMove = (moveEvent) => {
            const deltaY = startY - moveEvent.clientY;
            const sensitivity = 0.005;
            let newValue = startValue + deltaY * sensitivity;
            newValue = Math.max(0, Math.min(1, newValue));
            
            this.knobValues[this.getKnobId(knob)] = newValue;
            this.updateKnobDisplay(knob, newValue, valueDisplay, indicator);
            this.sendParameterUpdate(knob, newValue);
        };
        
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    updateKnobDisplay(knob, value, valueDisplay, indicator) {
        const rotation = value * 270 - 135;
        if (indicator) {
            indicator.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
        }
        
        if (valueDisplay) {
            const param = knob.dataset.param;
            if (param === 'bands') {
                valueDisplay.textContent = Math.floor(value * 32);
            } else {
                valueDisplay.textContent = value.toFixed(2);
            }
        }
        
        this.updateParameterVisuals(knob, value);
    }

    sendParameterUpdate(knob, value) {
        const module = knob.dataset.osc || knob.dataset.fx;
        const param = knob.dataset.param;
        console.log(`I2C PARAM: ${module}.${param} = ${value.toFixed(3)}`);
        
        // Send to backend
        if (this.socket && this.socket.connected) {
            this.socket.emit('parameter', { 
                module: module, 
                parameter: param, 
                value: value 
            });
        }
    }

    updateParameterVisuals(knob, value) {
        const param = knob.dataset.param;
        
        // Update LFO visualization
        if (param === 'rate') {
            const visual = document.querySelector('.lfo-wave');
            if (visual) {
                visual.style.animationDuration = `${2 / value}s`;
            }
        }
        
        // Update filter visualization
        if (param === 'cutoff' && this.oscillators) {
            Object.values(this.oscillators).forEach(osc => {
                if (osc.filter) {
                    osc.filter.frequency.value = 200 + value * 1800;
                }
            });
        }
    }

    // Fader functionality
    setupFaders() {
        document.querySelectorAll('.fader-thumb').forEach(fader => {
            const track = fader.parentElement;
            const meter = track.previousElementSibling ? track.previousElementSibling.querySelector('.meter-fill') : null;
            
            fader.addEventListener('mousedown', (e) => this.startFaderDrag(e, fader, track, meter));
        });
    }

    startFaderDrag(e, fader, track, meter) {
        e.preventDefault();
        const trackRect = track.getBoundingClientRect();
        const startY = e.clientY;
        const startTop = parseFloat(fader.style.top) || 50;
        
        const onMouseMove = (moveEvent) => {
            const deltaY = moveEvent.clientY - startY;
            const trackHeight = trackRect.height;
            const pixelPercent = 100 / trackHeight;
            let newTop = startTop + deltaY * pixelPercent;
            newTop = Math.max(0, Math.min(100, newTop));
            
            fader.style.top = `${newTop}%`;
            if (meter) {
                meter.style.height = `${100 - newTop}%`;
            }
            
            this.sendFaderUpdate(fader, newTop);
        };
        
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    sendFaderUpdate(fader, value) {
        const channelElement = fader.closest('.channel');
        if (!channelElement) return;
        
        const channelName = channelElement.querySelector('.channel-name');
        if (!channelName) return;
        
        const channel = channelName.textContent;
        console.log(`I2C FADER: ${channel} = ${(100 - value).toFixed(1)}%`);
        
        // Send to backend
        if (this.socket && this.socket.connected) {
            this.socket.emit('fader', { 
                channel: channel, 
                value: (100 - value) / 100 
            });
        }
    }

    // BPM control
    updateBPM() {
        const bpmDisplay = document.getElementById('bpmDisplay');
        if (bpmDisplay) {
            bpmDisplay.textContent = this.bpm;
        }
        
        if (this.isPlaying) {
            this.stopSequencer();
            this.startSequencer();
        }
        
        console.log(`I2C CLOCK: BPM updated to ${this.bpm}`);
        
        // Send to backend
        if (this.socket && this.socket.connected) {
            this.socket.emit('bpm', { bpm: this.bpm });
        }
    }

    // Event listeners setup
    setupEventListeners() {
        // Transport controls
        const playBtn = document.getElementById('playBtn');
        const stopBtn = document.getElementById('stopBtn');
        const recBtn = document.getElementById('recBtn');
        
        if (playBtn) {
            playBtn.addEventListener('click', () => {
                if (!this.isPlaying) {
                    this.startSequencer();
                }
            });
        }
        
        if (stopBtn) {
            stopBtn.addEventListener('click', () => {
                this.stopSequencer();
            });
        }
        
        if (recBtn) {
            recBtn.addEventListener('click', () => {
                this.isRecording = !this.isRecording;
                recBtn.classList.toggle('active', this.isRecording);
                console.log(`RECORDING: ${this.isRecording ? 'STARTED' : 'STOPPED'}`);
                
                // Send to backend
                if (this.socket && this.socket.connected) {
                    this.socket.emit('record', { recording: this.isRecording });
                }
            });
        }
        
        // BPM slider
        const bpmSlider = document.getElementById('bpmSlider');
        if (bpmSlider) {
            bpmSlider.addEventListener('input', (e) => {
                this.bpm = parseInt(e.target.value);
                this.updateBPM();
            });
        }
        
        // Tab switching
        this.setupTabSwitching('.osc-section .tabs button', '[data-osc-panel]', 'data-osc');
        this.setupTabSwitching('.env-section .tabs button', '[data-env-panel]', 'data-env');
        this.setupTabSwitching('.lfo-section .tabs button', '[data-lfo-panel]', 'data-lfo');
        
        // Waveform selection
        document.querySelectorAll('.wave-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const container = btn.closest('.osc-content');
                if (container) {
                    container.querySelectorAll('.wave-btn').forEach(b => b.classList.remove('active'));
                }
                btn.classList.add('active');
                console.log(`SYNTH: Waveform changed to ${btn.dataset.wave}`);
            });
        });
        
        // Effect toggles
        document.querySelectorAll('.fx-toggle').forEach(toggle => {
            toggle.addEventListener('click', () => {
                toggle.classList.toggle('on');
                const effectUnit = toggle.closest('.fx-unit');
                if (effectUnit) {
                    const effect = effectUnit.querySelector('.fx-name');
                    if (effect) {
                        console.log(`EFFECT: ${effect.textContent} ${toggle.classList.contains('on') ? 'ENABLED' : 'DISABLED'}`);
                    }
                }
            });
        });
        
        // Mute/Solo buttons
        document.querySelectorAll('.mute-btn, .solo-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.classList.toggle('active');
                const channel = btn.closest('.channel');
                if (channel) {
                    const channelName = channel.querySelector('.channel-name');
                    if (channelName) {
                        const action = btn.classList.contains('mute-btn') ? 'MUTE' : 'SOLO';
                        console.log(`MIXER: ${channelName.textContent} ${action} ${btn.classList.contains('active') ? 'ON' : 'OFF'}`);
                    }
                }
            });
        });
        
        // Sequencer controls
        const clearSeqBtn = document.getElementById('clearSeq');
        const randomSeqBtn = document.getElementById('randomSeq');
        const arpBtn = document.getElementById('arpBtn');
        
        if (clearSeqBtn) {
            clearSeqBtn.addEventListener('click', () => {
                document.querySelectorAll('.step.active').forEach(step => {
                    step.classList.remove('active');
                });
                console.log('SEQUENCER: Pattern cleared');
            });
        }
        
        if (randomSeqBtn) {
            randomSeqBtn.addEventListener('click', () => {
                document.querySelectorAll('.step').forEach(step => {
                    step.classList.toggle('active', Math.random() > 0.7);
                });
                console.log('SEQUENCER: Random pattern generated');
            });
        }
        
        if (arpBtn) {
            arpBtn.addEventListener('click', () => {
                console.log('ARPEGGIATOR: Mode toggled');
            });
        }
        
        // Sampler controls
        const loadSampleBtn = document.getElementById('loadSample');
        const recordSampleBtn = document.getElementById('recordSample');
        
        if (loadSampleBtn) {
            loadSampleBtn.addEventListener('click', () => {
                console.log('SAMPLER: Loading WAV file from SD card...');
            });
        }
        
        if (recordSampleBtn) {
            recordSampleBtn.addEventListener('click', () => {
                console.log('SAMPLER: Recording started...');
            });
        }
        
        // Master controls
        const savePatchBtn = document.getElementById('savePatch');
        const loadPatchBtn = document.getElementById('loadPatch');
        
        if (savePatchBtn) {
            savePatchBtn.addEventListener('click', () => {
                console.log('MASTER: Saving patch to EEPROM...');
                
                // Send to backend
                if (this.socket && this.socket.connected) {
                    this.socket.emit('savePatch', { 
                        name: 'current_patch',
                        parameters: this.knobValues 
                    });
                }
            });
        }
        
        if (loadPatchBtn) {
            loadPatchBtn.addEventListener('click', () => {
                console.log('MASTER: Loading patch from EEPROM...');
                
                // Request from backend
                if (this.socket && this.socket.connected) {
                    this.socket.emit('loadPatch', { name: 'current_patch' });
                }
            });
        }
        
        // WebSocket connection simulation
        const connectBtn = document.getElementById('connectBtn');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => {
                this.simulateWebConnection();
            });
        }
        
        // Keyboard events for piano
        document.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });
        
        document.addEventListener('keyup', (e) => {
            this.handleKeyUp(e);
        });
        
        // Theremin simulation
        this.setupTheremin();
    }

    setupTabSwitching(tabSelector, panelSelector, dataAttr) {
        document.querySelectorAll(tabSelector).forEach(tab => {
            tab.addEventListener('click', () => {
                const section = tab.closest('.card');
                if (!section) return;
                
                const target = tab.dataset[dataAttr];
                
                section.querySelectorAll('.tabs button').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                section.querySelectorAll(panelSelector).forEach(panel => {
                    const panelDataAttr = `data-${dataAttr.toLowerCase()}-panel`;
                    panel.style.display = panel.dataset[dataAttr.toLowerCase() + 'Panel'] === target ? 'block' : 'none';
                });
                
                console.log(`UI: Switched to ${target} panel`);
            });
        });
    }

    setupTheremin() {
        const thereminField = document.querySelector('.theremin-field');
        const thereminHand = document.getElementById('thereminHand');
        
        if (thereminField && thereminHand) {
            thereminField.addEventListener('mousemove', (e) => {
                const rect = thereminField.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                
                thereminHand.style.left = `${x}%`;
                thereminHand.style.top = `${y}%`;
                
                // Simulate theremin control
                const pitch = (x / 100) * 1000 + 100;
                const volume = (1 - y / 100) * 0.5;
                
                console.log(`THEREMIN: Pitch=${pitch.toFixed(1)}Hz, Volume=${volume.toFixed(2)}`);
                
                // Send to backend
                if (this.socket && this.socket.connected) {
                    this.socket.emit('theremin', { x: x / 100, y: y / 100 });
                }
            });
        }
    }

    handleKeyDown(e) {
        const keyMap = {
            'a': 'C', 'w': 'C#', 's': 'D', 'e': 'D#', 'd': 'E',
            'f': 'F', 't': 'F#', 'g': 'G', 'y': 'G#', 'h': 'A',
            'u': 'A#', 'j': 'B', 'k': 'C2'
        };
        
        if (keyMap[e.key] && !e.repeat) {
            const key = document.querySelector(`.key[data-note="${keyMap[e.key]}"]`);
            if (key) {
                this.playPianoNote(key, true);
            }
        }
    }

    handleKeyUp(e) {
        const keyMap = {
            'a': 'C', 'w': 'C#', 's': 'D', 'e': 'D#', 'd': 'E',
            'f': 'F', 't': 'F#', 'g': 'G', 'y': 'G#', 'h': 'A',
            'u': 'A#', 'j': 'B', 'k': 'C2'
        };
        
        if (keyMap[e.key]) {
            const key = document.querySelector(`.key[data-note="${keyMap[e.key]}"]`);
            if (key) {
                this.playPianoNote(key, false);
            }
        }
    }

    simulateWebConnection() {
        const wsStatus = document.getElementById('wsStatus');
        const hostInput = document.getElementById('hostInput');
        
        if (!wsStatus || !hostInput) return;
        
        wsStatus.textContent = 'I2C: Connecting...';
        wsStatus.className = 'pill';
        
        setTimeout(() => {
            wsStatus.textContent = `I2C: ${hostInput.value}`;
            wsStatus.className = 'pill connected';
            console.log(`WEB: Connected to ${hostInput.value}`);
        }, 1000);
    }
}

// Initialize the hardware groovebox when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const groovebox = new HardwareGroovebox();
    
    // Make it globally available for debugging
    window.groovebox = groovebox;
});