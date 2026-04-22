import { el, mount, toast } from '../ui.js';
import { api } from '../api.js';
import { store } from '../store.js';
import { navigate } from '../router.js';
import { connect } from '../ws.js';

export function loginView({ search }) {
  const form = el('form', { class: 'card stack' }, [
    el('h1', {}, 'Ingresar'),
    el('div', { class: 'field' }, [el('label', {}, 'Email'), el('input', { name: 'email', type: 'email', required: true })]),
    el('div', { class: 'field' }, [el('label', {}, 'Contraseña'), el('input', { name: 'password', type: 'password', required: true })]),
    el('button', { type: 'submit' }, 'Ingresar'),
    el('a', { href: '#/register', class: 'btn ghost' }, 'Crear cuenta'),
  ]);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const r = await api.login(data);
      store.setAuth(r);
      toast('Bienvenido');
      connect();
      navigate(search.next || '/');
    } catch (err) { toast(err.message || 'Credenciales inválidas'); }
  });
  mount(form);
}

export function registerView({ search }) {
  const form = el('form', { class: 'card stack' }, [
    el('h1', {}, 'Crear cuenta'),
    el('div', { class: 'field' }, [el('label', {}, 'Nombre completo'), el('input', { name: 'fullName', required: true })]),
    el('div', { class: 'field' }, [el('label', {}, 'Email'), el('input', { name: 'email', type: 'email', required: true })]),
    el('div', { class: 'field' }, [el('label', {}, 'Teléfono'), el('input', { name: 'phone' })]),
    el('div', { class: 'field' }, [el('label', {}, 'Contraseña (mín 8)'), el('input', { name: 'password', type: 'password', minlength: '8', required: true })]),
    el('div', { class: 'field' }, [
      el('label', {}, '¿Para qué usás CompartoViaje?'),
      el('select', { name: 'role' }, [
        el('option', { value: 'passenger' }, 'Viajar como pasajero'),
        el('option', { value: 'driver' }, 'Ofrecer viajes (conductor)'),
        el('option', { value: 'both' }, 'Ambos'),
      ]),
    ]),
    el('button', { type: 'submit' }, 'Registrarme'),
    el('a', { href: '#/login', class: 'btn ghost' }, 'Ya tengo cuenta'),
  ]);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form).entries());
    const roles = d.role === 'both' ? ['passenger', 'driver'] : [d.role];
    try {
      const r = await api.register({ email: d.email, password: d.password, fullName: d.fullName, phone: d.phone, roles });
      store.setAuth(r);
      toast('Cuenta creada');
      connect();
      navigate(search.next || '/');
    } catch (err) { toast(err.message || 'No se pudo crear'); }
  });
  mount(form);
}
