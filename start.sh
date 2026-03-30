#!/bin/bash

# Script de Inicio - IRC Hispano Client
# Este script facilita el inicio del cliente en desarrollo y producción

set -e  # Exit on error

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Funciones
print_header() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════╗"
    echo "║  IRC Hispano Client - Script de Inicio       ║"
    echo "╚════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

check_nodejs() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js no está instalado"
        echo "Descarga desde: https://nodejs.org/"
        exit 1
    fi
    print_success "Node.js encontrado: $(node --version)"
}

check_npm() {
    if ! command -v npm &> /dev/null; then
        print_error "npm no está instalado"
        exit 1
    fi
    print_success "npm encontrado: $(npm --version)"
}

install_dependencies() {
    if [ ! -d "node_modules" ]; then
        print_info "Instalando dependencias..."
        npm install
        print_success "Dependencias instaladas"
    else
        print_info "Dependencias ya instaladas"
    fi
}

start_dev() {
    print_header
    print_info "Modo: DESARROLLO"
    echo ""

    check_nodejs
    check_npm
    install_dependencies

    echo ""
    print_warning "Se abrirán DOS terminales:"
    echo ""
    
    print_info "Terminal 1: Servidor Proxy IRC"
    echo "  Comando: node server.js"
    echo "  Puerto: 3001"
    echo ""
    
    print_info "Terminal 2: Cliente Web (Vite)"
    echo "  Comando: npm run dev"
    echo "  Puerto: 3000"
    echo ""
    
    read -p "¿Continuar? (s/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        print_info "Iniciando servidor proxy..."
        node server.js &
        PROXY_PID=$!
        sleep 2

        print_info "Abriendo navegador en 3 segundos..."
        sleep 3

        print_info "Iniciando cliente web..."
        npm run dev

        # Limpiar al salir
        kill $PROXY_PID 2>/dev/null || true
    else
        print_error "Operación cancelada"
    fi
}

start_improved() {
    print_header
    print_info "Modo: DESARROLLO (Servidor Mejorado)"
    echo ""

    check_nodejs
    check_npm
    install_dependencies

    echo ""
    print_info "Iniciando con servidor mejorado (validación + rate limiting)..."
    echo ""
    
    read -p "¿Continuar? (s/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        print_info "Iniciando servidor proxy mejorado..."
        node server-improved.js &
        PROXY_PID=$!
        sleep 2

        print_info "Abriendo navegador en 3 segundos..."
        sleep 3

        print_info "Iniciando cliente web..."
        npm run dev

        # Limpiar al salir
        kill $PROXY_PID 2>/dev/null || true
    else
        print_error "Operación cancelada"
    fi
}

build() {
    print_header
    print_info "Compilando para producción..."
    echo ""

    check_nodejs
    check_npm
    install_dependencies

    npm run build

    print_success "Compilación completada"
    print_info "Archivos en: dist/"
    echo ""
    echo "Para servir:"
    echo "  npm install -g serve"
    echo "  serve -s dist"
}

# Mostrar menu
show_menu() {
    echo ""
    echo "¿Qué deseas hacer?"
    echo ""
    echo "1) Desarrollo (servidor básico)"
    echo "2) Desarrollo (servidor mejorado con validación)"
    echo "3) Compilar para producción"
    echo "4) Salir"
    echo ""
    read -p "Selecciona opción (1-4): " choice
    
    case $choice in
        1) start_dev ;;
        2) start_improved ;;
        3) build ;;
        4) print_info "¡Hasta luego!"; exit 0 ;;
        *) print_error "Opción inválida"; show_menu ;;
    esac
}

# Main
print_header
show_menu
