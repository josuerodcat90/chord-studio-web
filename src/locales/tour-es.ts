export default {
  label: 'Recorrido guiado',
  progress: 'Paso {{current}} de {{total}}',
  close: 'Cerrar', back: 'Anterior', finish: 'Finalizar', next: 'Siguiente',
  steps: {
    visualizer: { title: 'Visualizador de audio', text: 'La pantalla muestra el acorde actual y la salida de audio combinada. Cambia entre Forma de onda y Espectro sin alterar el sonido.' },
    controls: { title: 'Controles de sonido', text: 'Elige la tonalidad mayor, la voz, el volumen, la reverberación y el color del acorde. Los cambios también afectan a los acordes que están sonando.' },
    joystick: { title: 'Joystick de acordes', text: 'Arrastra el joystick o mantén pulsadas las flechas sin asignar para cambiar los acordes que suenan: arriba cambia la tercera, derecha añade una séptima, izquierda añade una suspensión y abajo añade una sexta. Las diagonales combinan colores. Mantener joystick conserva la dirección al soltarlo.' },
    pitchBend: { title: 'Modulación de tono', text: 'Mueve el control hacia arriba o abajo hasta 2 semitonos. Cambia los acordes mientras suenan. El centro es el tono normal; Restablecer modulación de tono vuelve al centro inmediatamente.' },
    metronome: { title: 'Metrónomo', text: 'Inicia o detén el metrónomo y ajusta su tempo en BPM y sus pulsos por compás. Las luces siguen cada pulso y el primero suena más agudo.' },
    reset: { title: 'Detener y restablecer', text: 'Apagar todo detiene el metrónomo, silencia los acordes y las colas de reverberación, libera las entradas, desactiva los sostenidos y centra el joystick sin cambiar los ajustes ni las asignaciones. Restablecer configuración también restaura los valores del instrumento, el tempo y los pulsos del metrónomo y las asignaciones de teclado; el tema y el cierre del recorrido no cambian.' },
    bindings: { title: 'Asignaciones de teclado', text: 'Haz clic derecho en un pad de acorde y pulsa una tecla para asignarla. Al reutilizar una tecla se elimina su asignación anterior; Escape cancela. Las asignaciones se guardan en este navegador.' },
    play: { title: 'Tocar acordes', text: 'Mantén pulsado un pad de acorde o su tecla asignada para tocar. Mantén varios acordes para superponerlos; arrastra entre pads para cambiar de acorde.' },
    sustain: { title: 'Sostener acordes', text: 'Activa Sostener antes de tocar para que el acorde siga sonando al soltarlo. Pulsa de nuevo el acorde sostenido para silenciarlo o desactiva Sostener.' },
  },
};
