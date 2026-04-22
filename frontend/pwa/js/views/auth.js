import { el, mount, toast } from '../ui.js';
import { api } from '../api.js';
import { store } from '../store.js';
import { navigate } from '../router.js';
import { connect } from '../ws.js';

export function loginView({ search }) {
  const form = el('form', { class: 'card stack' }, [
    el('h1', { style: 'margin-top:0' }, 'Ingresar'),
    el('div', { class: 'muted', style: 'margin-top:-6px' }, 'Bienvenido de vuelta'),
    el('div', { class: 'field' }, [el('label', {}, 'Email'), el('input', { name: 'email', type: 'email', required: true, placeholder: 'vos@mail.com' })]),
    el('div', { class: 'field' }, [el('label', {}, 'Contraseña'), el('input', { name: 'password', type: 'password', required: true })]),
    el('button', { type: 'submit', class: 'block' }, 'Ingresar'),
    el('a', { href: '#/register', class: 'btn ghost block' }, '¿No tenés cuenta? Registrate'),
  ]);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const r = await api.login(data);
      store.setAuth(r);
      toast('¡Bienvenido!');
      connect();
      navigate(search.next || '/');
    } catch (err) { toast(err.message || 'Credenciales inválidas'); }
  });
  mount(el('div', {}, [
    el('section', { class: 'hero' }, [
      el('p', { class: 'greeting' }, 'Diseño · Argentina 🇦🇷'),
      el('h1', {}, 'Compartí el camino'),
    ]),
    form,
  ]));
}

export function registerView({ search }) {
  const form = el('form', { class: 'card stack' }, [
    el('h1', { style: 'margin-top:0' }, 'Crear cuenta'),
    el('div', { class: 'field' }, [el('label', {}, 'Nombre completo'), el('input', { name: 'fullName', required: true, placeholder: 'María López' })]),
    el('div', { class: 'field' }, [el('label', {}, 'Email'), el('input', { name: 'email', type: 'email', required: true, placeholder: 'vos@mail.com' })]),
    el('div', { class: 'field' }, [el('label', {}, 'Teléfono'), el('input', { name: 'phone', placeholder: '+54 11 4567-8901' })]),
    el('div', { class: 'field' }, [el('label', {}, 'Contraseña (mín 8)'), el('input', { name: 'password', type: 'password', minlength: '8', required: true })]),
    el('div', { class: 'field' }, [
      el('label', {}, '¿Para qué usás CompartoViaje?'),
      el('select', { name: 'role' }, [
        el('option', { value: 'passenger' }, 'Viajar como pasajero'),
        el('option', { value: 'driver' }, 'Ofrecer viajes (conductor)'),
        el('option', { value: 'both' }, 'Ambos'),
      ]),
    ]),
    el('button', { type: 'submit', class: 'block' }, 'Crear cuenta'),
    el('a', { href: '#/login', class: 'btn ghost block' }, 'Ya tengo cuenta'),
  ]);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form).entries());
    const roles = d.role === 'both' ? ['passenger', 'driver'] : [d.role];
    try {
      const r = await api.register({ email: d.email, password: d.password, fullName: d.fullName, phone: d.phone, roles });
      store.setAuth(r);
      toast('¡Cuenta creada!');
      connect();
      navigate(search.next || '/');
    } catch (err) { toast(err.message || 'No se pudo crear'); }
  });
  mount(el('div', {}, [
    el('section', { class: 'hero' }, [
      el('p', { class: 'greeting' }, 'Unite a la comunidad'),
      el('h1', {}, 'Crear cuenta'),
    ]),
    form,
  ]));
}
