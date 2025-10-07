// URL base da nossa API.
const API_URL = '';

document.addEventListener('DOMContentLoaded', () => {

    // --- LÓGICA DA PÁGINA DE LOGIN ---
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const errorMessage = document.getElementById('errorMessage');
            if (errorMessage) errorMessage.textContent = '';

            const username = loginForm.username.value;
            const password = loginForm.password.value;

            try {
                const response = await fetch(`${API_URL}/api/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password }),
                });
                const result = await response.json();

                if (response.ok) {
                    window.location.href = '/menu';
                } else {
                    if (errorMessage) errorMessage.textContent = result.message || 'Erro ao fazer login.';
                }
            } catch (error) {
                console.error('Erro de conexão:', error);
                if (errorMessage) errorMessage.textContent = 'Não foi possível conectar ao servidor.';
            }
        });
    }

    // --- LÓGICA DA PÁGINA DE MENU (CLIMA DINÂMICO) ---
    const weatherWidget = document.getElementById('weather-widget');
    if (weatherWidget) {
        const locationForm = document.getElementById('locationForm');
        const cidadeInput = document.getElementById('cidadeInput');
        const forecastDiv = document.getElementById('weather-forecast');
        const weatherTitle = document.getElementById('weather-title');
        const weatherError = document.getElementById('weather-error');
        const changeCityBtn = document.getElementById('change-city-btn');

        const carregarClima = async (cidade) => {
            if (!cidade) {
                locationForm.style.display = 'block';
                forecastDiv.style.display = 'none';
                if(changeCityBtn) changeCityBtn.style.display = 'none';
                return;
            }

            locationForm.style.display = 'none';
            weatherError.textContent = '';
            forecastDiv.innerHTML = '<p>A carregar previsão...</p>';
            forecastDiv.style.display = 'flex';


            try {
                const response = await fetch(`${API_URL}/api/clima`, {
                    method: 'POST', // --- CORREÇÃO DO MÉTODO ---
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cidade: cidade }),
                });
                
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.erro || 'Não foi possível buscar a previsão.');
                }
                
                weatherTitle.textContent = `Previsão para ${data.cidade}`;
                const formatarData = (dataString) => {
                    const [, mes, dia] = dataString.split('-');
                    return `${dia}/${mes}`;
                };

                forecastDiv.innerHTML = '';
                data.previsao.forEach(dia => {
                    const dayDiv = document.createElement('div');
                    dayDiv.className = 'weather-card';
                    dayDiv.innerHTML = `
                        <p class="weather-date">${formatarData(dia.data)}</p>
                        <img src="${dia.icone}" alt="${dia.descricao}" class="weather-icon">
                        <p class="weather-temp">${dia.temp}°C</p>
                        <p class="weather-desc">${dia.descricao}</p>
                    `;
                    forecastDiv.appendChild(dayDiv);
                });
                
                if(changeCityBtn) changeCityBtn.style.display = 'inline-block';

            } catch (error) {
                console.error("Erro ao carregar clima:", error);
                weatherError.textContent = error.message;
                forecastDiv.style.display = 'none';
                locationForm.style.display = 'block';
                if(changeCityBtn) changeCityBtn.style.display = 'none';
                localStorage.removeItem('futcria_cidade');
            }
        };

        locationForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const cidade = cidadeInput.value.trim();
            if (cidade) {
                localStorage.setItem('futcria_cidade', cidade);
                carregarClima(cidade);
            }
        });
        
        if (changeCityBtn) {
            changeCityBtn.addEventListener('click', () => {
                localStorage.removeItem('futcria_cidade');
                cidadeInput.value = '';
                weatherTitle.textContent = 'Defina a sua Localização';
                carregarClima(null);
            });
        }

        const cidadeSalva = localStorage.getItem('futcria_cidade');
        carregarClima(cidadeSalva);
    }

    // --- LÓGICA DA PÁGINA DE JOGADORES ---
    const jogadoresTbody = document.getElementById('jogadoresTbody');
    if (jogadoresTbody) {
        const jogadorForm = document.getElementById('jogadorForm');
        const formTitle = document.getElementById('form-title');
        const jogadorIdInput = document.getElementById('jogadorId');
        const cancelarEdicaoBtn = document.getElementById('cancelarEdicao');

        const carregarJogadores = async () => {
            try {
                const response = await fetch(`${API_URL}/api/jogadores`);
                if (!response.ok) {
                    if (response.status === 401) { window.location.href = '/login'; }
                    return;
                }
                const jogadores = await response.json();
                jogadoresTbody.innerHTML = '';
                jogadores.forEach(jogador => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${jogador.nome}</td>
                        <td>${jogador.posicao || 'Não definida'}</td>
                        <td class="actions">
                            <button class="button-secondary edit-btn" data-id="${jogador.id}" data-nome="${jogador.nome}" data-posicao="${jogador.posicao || ''}" aria-label="Editar o jogador ${jogador.nome}">Editar</button>
                            <button class="button-danger delete-btn" data-id="${jogador.id}" aria-label="Excluir o jogador ${jogador.nome}">Excluir</button>
                        </td>
                    `;
                    jogadoresTbody.appendChild(tr);
                });
            } catch (error) { console.error('Erro:', error); }
        };

        jogadorForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const id = jogadorIdInput.value;
            const nome = jogadorForm.nome.value;
            const posicao = jogadorForm.posicao.value;
            const url = id ? `${API_URL}/api/jogadores/${id}` : `${API_URL}/api/jogadores`;
            const method = id ? 'PUT' : 'POST';

            try {
                const response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nome, posicao })
                });

                if (response.ok) {
                    jogadorForm.reset();
                    jogadorIdInput.value = '';
                    formTitle.textContent = 'Adicionar Novo Jogador';
                    cancelarEdicaoBtn.style.display = 'none';
                    carregarJogadores();
                } else {
                    alert(`Erro: ${(await response.json()).message}`);
                }
            } catch (error) { console.error('Erro:', error); }
        });

        jogadoresTbody.addEventListener('click', async (event) => {
            const target = event.target;
            const id = target.dataset.id;
            if (target.classList.contains('edit-btn')) {
                formTitle.textContent = 'Editar Jogador';
                jogadorIdInput.value = id;
                jogadorForm.nome.value = target.dataset.nome;
                jogadorForm.posicao.value = target.dataset.posicao;
                cancelarEdicaoBtn.style.display = 'inline-block';
                window.scrollTo(0, 0);
            }
            if (target.classList.contains('delete-btn')) {
                if (confirm('Tem certeza que deseja excluir este jogador?')) {
                    try {
                        const response = await fetch(`${API_URL}/api/jogadores/${id}`, { method: 'DELETE' });
                        if (response.ok) { carregarJogadores(); }
                        else { alert(`Erro: ${(await response.json()).message}`); }
                    } catch (error) { console.error('Erro:', error); }
                }
            }
        });

        cancelarEdicaoBtn.addEventListener('click', () => {
            jogadorForm.reset();
            jogadorIdInput.value = '';
            formTitle.textContent = 'Adicionar Novo Jogador';
            cancelarEdicaoBtn.style.display = 'none';
        });

        carregarJogadores();
    }

    // --- LÓGICA DA PÁGINA DE MONTAGEM DE TIMES ---
    const sortearTimesBtn = document.getElementById('sortearTimesBtn');
    if (sortearTimesBtn) {
        const listaJogadoresDiv = document.getElementById('listaJogadoresParaSorteio');
        const resultadoDiv = document.getElementById('resultadoSorteio');
        const listaTimeA = document.getElementById('listaTimeA');
        const listaTimeB = document.getElementById('listaTimeB');
        const errorMessage = document.getElementById('sorteioErrorMessage');
        const escudoTimeA = document.getElementById('escudoTimeA');
        const escudoTimeB = document.getElementById('escudoTimeB');

        const carregarJogadoresParaSorteio = async () => {
            try {
                const response = await fetch(`${API_URL}/api/jogadores`);
                if (!response.ok) {
                    if (response.status === 401) { window.location.href = '/login'; }
                    return;
                }
                const jogadores = await response.json();
                listaJogadoresDiv.innerHTML = '';
                jogadores.forEach(jogador => {
                    const label = document.createElement('label');
                    label.className = 'player-item';
                    label.innerHTML = `
                        <input type="checkbox" value="${jogador.nome}" aria-label="Selecionar o jogador ${jogador.nome}">
                        <span>${jogador.nome}</span>
                    `;
                    listaJogadoresDiv.appendChild(label);
                });
            } catch (error) {
                console.error("Erro ao carregar jogadores:", error);
                listaJogadoresDiv.innerHTML = '<p class="error-message">Não foi possível carregar os jogadores.</p>';
            }
        };

        sortearTimesBtn.addEventListener('click', () => {
            const checkboxes = listaJogadoresDiv.querySelectorAll('input[type="checkbox"]:checked');
            errorMessage.textContent = '';
            if (checkboxes.length !== 10) {
                errorMessage.textContent = 'Erro: Você deve selecionar exatamente 10 jogadores.';
                resultadoDiv.style.display = 'none';
                return;
            }
            const jogadoresSelecionados = Array.from(checkboxes).map(cb => cb.value);
            for (let i = jogadoresSelecionados.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [jogadoresSelecionados[i], jogadoresSelecionados[j]] = [jogadoresSelecionados[j], jogadoresSelecionados[i]];
            }
            const timeA = jogadoresSelecionados.slice(0, 5);
            const timeB = jogadoresSelecionados.slice(5, 10);
            listaTimeA.innerHTML = timeA.map(nome => `<li>${nome}</li>`).join('');
            listaTimeB.innerHTML = timeB.map(nome => `<li>${nome}</li>`).join('');
            
            escudoTimeA.src = '/static/images/city.png';
            escudoTimeB.src = '/static/images/united.png';
            
            resultadoDiv.style.display = 'grid';
        });

        carregarJogadoresParaSorteio();
    }
    
    // --- LÓGICA DA PÁGINA DE CALENDÁRIO ---
    const eventoForm = document.getElementById('eventoForm');
    if (eventoForm) {
        const listaEventos = document.getElementById('listaEventos');
        const formatarData = (dataString) => {
            const [ano, mes, dia] = dataString.split('-');
            return `${dia}/${mes}/${ano}`;
        };
        const carregarEventos = async () => {
            try {
                const response = await fetch(`${API_URL}/api/eventos`);
                if (!response.ok) {
                    if (response.status === 401) window.location.href = '/login';
                    return;
                }
                const eventos = await response.json();
                listaEventos.innerHTML = '';
                if (eventos.length === 0) {
                    listaEventos.innerHTML = '<li><p>Nenhum compromisso marcado.</p></li>';
                } else {
                    eventos.forEach(evento => {
                        const li = document.createElement('li');
                        li.className = 'event-item';
                        li.innerHTML = `
                            <div class="event-details">
                                <span class="event-date"><strong>Data:</strong> ${formatarData(evento.data)}</span>
                                <span class="event-time"><strong>Hora:</strong> ${evento.horario}</span>
                                <span class="event-desc">${evento.descricao}</span>
                            </div>
                            <button class="button-danger delete-evento-btn" data-id="${evento.id}" aria-label="Excluir o evento: ${evento.descricao} em ${formatarData(evento.data)}">Excluir</button>
                        `;
                        listaEventos.appendChild(li);
                    });
                }
            } catch (error) {
                console.error('Erro ao carregar eventos:', error);
                listaEventos.innerHTML = '<li><p class="error-message">Não foi possível carregar os compromissos.</p></li>';
            }
        };
        eventoForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const data = eventoForm.data.value;
            const horario = eventoForm.horario.value;
            const descricao = eventoForm.descricao.value;
            try {
                const response = await fetch(`${API_URL}/api/eventos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ data, horario, descricao })
                });
                if (response.ok) {
                    eventoForm.reset();
                    carregarEventos();
                } else { alert('Erro ao criar evento.'); }
            } catch (error) { console.error('Erro ao criar evento:', error); }
        });
        listaEventos.addEventListener('click', async (event) => {
            if (event.target.classList.contains('delete-evento-btn')) {
                const id = event.target.dataset.id;
                if (confirm('Tem certeza que deseja excluir este compromisso?')) {
                    try {
                        const response = await fetch(`${API_URL}/api/eventos/${id}`, { method: 'DELETE' });
                        if (response.ok) { carregarEventos(); }
                        else { alert('Erro ao excluir evento.'); }
                    } catch (error) { console.error('Erro ao excluir evento:', error); }
                }
            }
        });
        carregarEventos();
    }

    // --- LÓGICA GLOBAL (LOGOUT) ---
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                await fetch(`${API_URL}/api/logout`, { method: 'POST' });
                window.location.href = '/login';
            } catch (error) {
                console.error('Erro ao fazer logout:', error);
            }
        });
    }
});

