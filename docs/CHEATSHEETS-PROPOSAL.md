# Предложение: две шпаргалки по вёрстке интерфейса

Два автономных HTML-документа (как `typography-cheatsheet-standalone.html`): один — только типографика, второй — компоненты и **все отступы** (включая отступы от краёв экрана). Цель — единый стиль при вёрстке с нуля в других приложениях.

---

## Документ 1: «Типографика» (typography-cheatsheet.html)

**Только шрифты и начертания.** Без отступов, без размеров блоков.

### Содержание

1. **Шрифтовой стек**
   - `--font-base`: Ubuntu, Segoe UI, Tahoma…
   - Наследование: `font: inherit` для input/button/select.

2. **Размеры текста (всего 3 шага)**
   - `--text-size-down`: 12px (метаданные, подписи).
   - `--text-size-base`: 13px (основной текст).
   - `--text-size-up`: 15px (заголовки, акцент).

3. **Межстрочность и начертания**
   - `--text-line-height-base`: 1.2.
   - `--text-weight-thin`: 300, `--text-weight-base`: 400, `--text-weight-bold`: 600.

4. **Классы-модификаторы текста**
   - `.text`, `.text--up`, `.text--down`, `.text--bold`, `.text--thin`, `.text--italic`.
   - Тональности: `.text--muted`, `.text--subtle`.
   - Декорации: `.text--strike`.

5. **Цвета текста (для иерархии)**
   - `--color-text`, `--color-text-muted`, `--color-text-subtle`.
   - Кратко: семантические цвета (success/danger и т.д.) — отдельно, не в типографике.

6. **Опционально: пользовательский интерфейс**
   - Для `body.interface-user` те же размеры/веса, только база 13px — одна строка, чтобы не дублировать.

*Формат: как текущая typography-cheatsheet-standalone — встроенные стили, примеры строк с классами, минимум вёрстки.*

---

## Документ 2: «Компоненты и отступы» (components-spacing-cheatsheet.html)

**Всё про каркас: отступы от экрана, между блоками, внутри компонентов, таблицы, кнопки, попапы.** Большой акцент на «от чего до чего какой отступ».

### Содержание

#### A. Токены отступов и базовая сетка

1. **Шкала отступов (space scale)**
   - `--space-1` … `--space-6`: 4px, 8px, 12px, 16px, 20px, 24px.
   - Таблица: токен → значение → пример использования (между иконкой и текстом, внутренний padding кнопки и т.д.).

2. **Два главных gap-токена**
   - `--gap-inline`: горизонтальный зазор между элементами в строке (по умолчанию = space-2).
   - `--gap-stack`: вертикальный зазор между блоками (по умолчанию = space-2).
   - Правило: «все расстояния между блоками и внутри секций строятся из этих двух (и из space-* при необходимости)».

3. **Отступы от краёв экрана (пользовательский интерфейс)**
   - **Единый внешний отступ:** `--user-space: calc(var(--space-2) * 0.6667)` (~5.33px).
   - **Контейнер приложения:** `.app { padding: var(--user-space); padding-top: calc((var(--user-space) * 2) + 21px); }` — со всех сторон один ритм, сверху больше из‑за шапки.
   - **Шапка (header-bar):** `top/left/right: var(--user-space)` — в одну линию с padding контента.
   - **Сетка контента:** `gap: var(--user-space)` у `.app__layout`, `.app__top-row`, `.app__bottom-row`, `.weekend-stack` — один и тот же зазор между колонками/панелями.
   - Явно подписать: «отступ от левого/правого/нижнего края окна = --user-space; сверху — в 2 раза больше + высота шапки».

4. **Секции и панели (внутренние отступы)**
   - `--section-pad-x`, `--section-pad-y`, `--section-gap-x`, `--section-gap-y`, `--section-bar-height`.
   - Формулы: например `--section-pad-x: calc(var(--gap-inline) + var(--space-1))`.
   - `.section__body`: padding и gap из этих токенов.
   - `.panel`: padding по умолчанию `var(--space-3)`; в интерфейсе user — `var(--user-space)` и `gap: var(--user-space)`.

#### B. Компоненты (структура + отступы)

5. **Панель (panel)**
   - Рамка, фон, padding, gap.
   - Вариант user: без скругления, более выраженная граница.

6. **Секция с header/body/footer**
   - Высота header/footer: `--section-bar-height` (36px).
   - Граница между header и body: `border-bottom: 1px solid var(--color-border-subtle)`; между body и footer — `border-top`.
   - Модификаторы выравнивания: `--start`, `--end`, `--between`.
   - Кнопки в header/footer: высота `--section-button-height`, отступы.

7. **Стек секций (section-stack)**
   - Вертикальный список блоков без общей обёртки.
   - `gap: calc(var(--gap-stack) * 2)` между блоками.
   - Когда использовать: экран «только контент» без общего заголовка (как Уведомления, Пропуска, Справочники).

8. **Группы секций (section-group)**
   - `margin-bottom: calc(var(--gap-stack) * 2)`; между элементами группы: `.section-group__item + .section-group__item { margin-top: calc(var(--gap-stack) * 2) }`.
   - Заголовок группы: `margin 0 0 var(--gap-inline) 0`.

9. **Блоки «от/до» (section-block-start / section-block-end)**
   - `section-block-start`: `margin-top: calc(var(--gap-stack) * 2)`.
   - `section-block-end`: `margin-bottom: calc(var(--gap-stack) * 2)`.
   - Для разделения крупных блоков контента.

10. **Layout с боковым меню (layout)**
    - `.layout__body`: grid, колонка нав 220px, gap 0, `padding-top: var(--space-1)`.
    - `.layout__nav`: padding-right `--section-pad-x`, border-right.
    - `.layout__content`: `padding-left: var(--section-pad-x)` — отступ контента от навбара.
    - `.layout__list`: `gap: var(--gap-stack)`. `.layout__item`: внутренние отступы (2px 4px).

#### C. Контролы и таблицы

11. **Кнопки**
    - Размеры: обычная, small; padding, height в header/footer из токенов.
    - Иконка-кнопка: квадрат `--section-button-height`.

12. **Поля ввода**
    - Рамка, padding, border-radius; в формах — отступ между полями (например через notify__field: gap).

13. **Таблицы**
    - Отступы ячеек (padding 2px 4px или компактные).
    - Разделитель «данные | действия»: border-right перед последней колонкой, padding-right у предпоследней.
    - Стиль строк: фон, hover, скругление первой/последней ячейки строки (как в user-management / visit-goals).

14. **Попапы / тосты**
    - Отступ от края экрана: `top/left/right: var(--space-4)` (или в user: `var(--space-4)`), ширина с учётом `min(420px, 100vw - 2*space)`.
    - Внутренние отступы попапа и отступ между кнопками.

#### D. Радиусы и границы

15. **Радиусы**
    - `--radius-sm`: 4px для полей, кнопок, карточек.
    - В интерфейсе user: панели с `border-radius: 0`.

16. **Границы**
    - Токены: `--color-border`, `--color-border-strong`, `--color-border-subtle`.
    - Где что: разделители секций — subtle; рамки панелей — strong в user.

---

## Итог

- **Документ 1:** только типографика (шрифт, размеры, веса, классы текста, цвета текста). Без отступов и размеров блоков.
- **Документ 2:** токены отступов, **отступы от экрана (--user-space и .app)**, внутренние отступы секций/панелей, section-stack/group/block, layout, кнопки/поля/таблицы/попапы, радиусы и границы.

Так можно при вёрстке нового приложения: сначала задать типографику из шпаргалки 1, затем выставить «всё от всего» по шпаргалке 2 и получить тот же визуальный ритм и стиль.

Если такой план подходит, можно переходить к генерации двух HTML-файлов по этой структуре.
