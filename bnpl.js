;(function () {
'use strict'

///////////////////////////
////// Модальное окно
///////////////////////////
const bnplModal = document.querySelector('.bnpl-modal')
const modalCloseButton = bnplModal.querySelector('.bnpl-modal__close')

const modalFirstPercent = bnplModal.querySelectorAll('.bnpl-first-percent')
const modalRecsPercent = bnplModal.querySelectorAll('.bnpl-recs-percent')
const modalRecPercent = bnplModal.querySelectorAll('.bnpl-rec-percent')
const modalRecInterval = bnplModal.querySelectorAll('.bnpl-rec-interval')
const modalRecIntervalEvery = bnplModal.querySelectorAll('.bnpl-rec-interval-every')
const modalPayments = bnplModal.querySelector('.bnpl-schedule-calc__payments')


const closeBnplModal = () => {
    bnplModal.classList.remove('bnpl-modal--open')
    bnplModal.removeEventListener('wheel', preventModalScroll, {
        passive: false,
    })
    bnplModal.removeEventListener('touchmove', preventModalScroll, {
        passive: false,
    })
 
    for (let payment of modalPayments.querySelectorAll('.bnpl-schedule-calc__part')) {
        payment.remove()
    }
    modalPayments.querySelector('.bnpl-schedule-calc__others').remove()
}

modalCloseButton && modalCloseButton.addEventListener('click', closeBnplModal)

bnplModal && bnplModal.addEventListener('click', (event) => {
    if (event.target === bnplModal) closeBnplModal()
})

function openBnplModal(params) {
    bnplModal.classList.add('bnpl-modal--open')
    bnplModal.addEventListener('wheel', preventModalScroll, {
        passive: false,
    })
    bnplModal.addEventListener('touchmove', preventModalScroll, {
        passive: false,
    })

    // Подстановка данных о кол-ве платежей, процентах и т.д. в текстах модального окна
    Array.from(modalFirstPercent).forEach((el) => {
        el.innerHTML = params.firstPaymentPercents.toLocaleString('ru-RU')
    })
    Array.from(modalRecsPercent).forEach((el) => {
        el.innerHTML = params.recsPercents.toLocaleString('ru-RU')
    })
    Array.from(modalRecPercent).forEach((el) => {
        el.innerHTML = Number(params.recPercents).toLocaleString('ru-RU')
    })
    const intervalStr = (() => {
        if (params.isWeeks) {
            const weeksInterval = Math.floor(params.paymentsInterval / 7)
            
            return weeksInterval > 1
                ? `раз в ${weeksInterval} ${getWeeksFormatted(weeksInterval)}`
                : `раз в неделю`
        }
        return `раз в ${params.paymentsInterval} ${getDaysFormatted(params.paymentsInterval)}`
    })()
    Array.from(modalRecInterval).forEach((el) => {
        el.innerHTML = intervalStr
    })

    const intervalEveryStr = (() => {
        if (params.isWeeks) {
            const weeksInterval = Math.floor(params.paymentsInterval / 7)

            return weeksInterval > 1
                ? `каждые ${weeksInterval} ${getWeeksFormatted(weeksInterval)}`
                : `каждую неделю`
        }
        return `каждые ${params.paymentsInterval} ${getDaysFormatted(params.paymentsInterval)}`
    })()
    Array.from(modalRecIntervalEvery).forEach((el) => {
        el.innerHTML = intervalEveryStr
    })

    // Подстановка расписания платежей в модальное окно
    if (params.numRecPayments >= 4) {
        const getPaymentTemplate = () => `<div class="bnpl-schedule-calc__part bnpl-schedule-calc__part--combined">
            ${getLinesTemplate(params.numRecPayments)}
            <div class="bnpl-schedule-calc__descr">Еще ${params.numRecPayments} ${getPaymentsFormatted(
                params.numRecPayments
        )} ${intervalStr}</div>
            <div class="bnpl-schedule-calc__sum">по ${Number(params.recPercents).toLocaleString('ru-RU')}%</div>
        </div>`

        modalPayments.append(getElementFromTemplate(getPaymentTemplate()))
    } else {
        const getPaymentTemplate = (date) => `<div class="bnpl-schedule-calc__part">
            <div class="bnpl-schedule-calc__descr">через ${getDaysFromNow(date)}</div>
            <div class="bnpl-schedule-calc__sum">${Number(params.recPercents).toLocaleString('ru-RU')}%</div>
        </div>`

        const dates = getDatesArr(params.numRecPayments, params.paymentsInterval)

        const paymentsFragment = new DocumentFragment()
        dates.forEach((date) => {
            paymentsFragment.append(getElementFromTemplate(getPaymentTemplate(date)))
        })
        modalPayments.append(paymentsFragment)
    }

    // Подстановка расписания платежей для мобильных
    const getPaymentMobileTemplate = () => `<div class="bnpl-schedule-calc__others">
        ${getLinesTemplate(params.numRecPayments)}
        <div class="bnpl-schedule-calc__descr">Еще ${params.numRecPayments} ${getPaymentsFormatted(
            params.numRecPayments
    )} раз в ${params.paymentsInterval} ${getWeeksFormatted(params.paymentsInterval)}</div>
        <div class="bnpl-schedule-calc__sum">по ${Number(params.recPercents).toLocaleString('ru-RU')}%</div>
    </div>`
    modalPayments.querySelector('.bnpl-schedule-calc__today').after(getElementFromTemplate(getPaymentMobileTemplate()))
}

function preventModalScroll(event) {
    if (event.target === bnplModal) event.preventDefault()
}

// Открытие/закрытие спойлера в модальном окне
const bnplSpoilerHeader = bnplModal.querySelector('.bnpl-modal-spoiler__header')

bnplSpoilerHeader &&
    bnplSpoilerHeader.addEventListener('click', (event) => {
        const spoiler = event.target.closest('.bnpl-modal-spoiler')
        const spoilerBody = spoiler.querySelector('.bnpl-modal-spoiler__body')

        spoiler.classList.toggle('bnpl-modal-spoiler--open')
        spoilerBody.style.maxHeight = spoiler.classList.contains('bnpl-modal-spoiler--open')
            ? spoilerBody.scrollHeight + 'px'
            : null
    })

/////////
// Подстановка информации в виджеты
/////////

// Виджеты без расписания
const bnplSmallCards = document.querySelectorAll('.bnpl-card--small')

bnplSmallCards.length &&
    bnplSmallCards.forEach((card) => {
        const price = toNumber(card.dataset.price)
        const numPayments = toNumber(card.dataset.paymentsNumber)
        const firstPaymentPercents = toNumber(card.dataset.firstPaymentPercents)
        const paymentsInterval = toNumber(card.dataset.paymentsInterval)
        const isWeeks = checkWeeks(paymentsInterval)
        
        // numRecPayments - количество рекуррентных платежей
        // recAmount - округленный до копеек размер рекуррентных платежей
        const numRecPayments = numPayments - 1
        const recAmountUnrounded = (price * 100 * (1 - 0.01 * firstPaymentPercents)) / numRecPayments / 100
        const recAmount =
            String(recAmountUnrounded).indexOf('.') !== -1 ? Math.floor(recAmountUnrounded * 100) / 100 : recAmountUnrounded

        // firstPayment - округленный до копеек размер первого платежа
        const remainder = recAmountUnrounded - recAmount
        const firstPayment = ((price * firstPaymentPercents) / 100 + numRecPayments * remainder).toFixed(2)

        // Подстановка информации в виджеты в зависимости от их типа
        let descrTemplate = ''
        if (card.classList.contains('bnpl-card--type-2-js')) {
            descrTemplate = `<b>${getPaymentAmount(firstPayment)}</b> сейчас, остальное — потом`
        } else if (card.classList.contains('bnpl-card--type-3-js')) {
            descrTemplate = `<b>${getPaymentAmount(firstPayment)}</b> × <b>${numPayments}</b>`
        } else if (card.classList.contains('bnpl-card--type-4-js')) {
            descrTemplate = `${numPayments} ${getPaymentsFormatted(numPayments)} по <b>${getPaymentAmount(firstPayment)}</b>`
        } else if (card.classList.contains('bnpl-card--type-5-js')) {
            descrTemplate = `${numPayments} ${getPaymentsFormatted(numPayments)} по <b>${getPaymentAmount(firstPayment)}</b> без переплат`
        }

        const descrEl = card.querySelector('.bnpl-descr')
        if (descrEl && descrTemplate) descrEl.innerHTML = descrTemplate

        //////////
        ////// Открытие модального окна в виджетах без расписания

        // recsPercents - процент от полной стоимости приходящийся на все рекуррентные платежи
        // recPercents - процент от полной стоимости, приходящийся на каждый рек. платеж в отдельности
        // numDays - все время рассрочки в днях
        const modalButton = card.querySelector('.bnpl-help-button')
        const recsPercents = 100 - firstPaymentPercents
        const recPercents = Number(recsPercents / numRecPayments).toFixed(2)
        const numDays = paymentsInterval * numRecPayments

        modalButton && modalButton.addEventListener('click', (event) => openBnplModal({
            firstPaymentPercents,
            recsPercents,
            recPercents,
            paymentsInterval,
            numDays,
            numRecPayments,
            isWeeks
        }))
    })


// Виджеты с расписанием
const bnplScheduleCards = document.querySelectorAll('.bnpl-card--schedule')

bnplScheduleCards.length &&
    bnplScheduleCards.forEach((card) => {
        const price = toNumber(card.dataset.price)
        const numPayments = toNumber(card.dataset.paymentsNumber)
        const firstPaymentPercents = toNumber(card.dataset.firstPaymentPercents)
        const paymentsInterval = toNumber(card.dataset.paymentsInterval)
        const isWeeks = checkWeeks(paymentsInterval)
        const weeksInterval = Math.floor(paymentsInterval / 7)

        // numRecPayments - количество рекуррентных платежей
        // recAmount - округленный до копеек размер рекуррентных платежей
        const numRecPayments = numPayments - 1
        const recAmountUnrounded = (price * 100 * (1 - 0.01 * firstPaymentPercents)) / numRecPayments / 100
        const recAmount =
            String(recAmountUnrounded).indexOf('.') !== -1 ? Math.floor(recAmountUnrounded * 100) / 100 : recAmountUnrounded

        // firstPayment - округленный до копеек размер первого платежа  
        const remainder = recAmountUnrounded - recAmount
        const firstPaymentStr = ((price * firstPaymentPercents) / 100 + numRecPayments * remainder).toFixed(2)
        const firstPayment = Number(firstPaymentStr)


        // Подстановка расписания платежей в виджет
        // isPaymentsCombined - флаг показывающий что отображение платежей никогда не разделяется по датам,
        // даже если платежей меньше 4
        const isPaymentsCombined = card.classList.contains('bnpl-card--type-7-js')
        
        if (isPaymentsCombined) {
            card.querySelector('.bnpl-schedule-calc__today .bnpl-schedule-calc__sum').innerHTML = `${getPaymentAmount(firstPaymentStr)}`
        } else {
            card.querySelector('.bnpl-schedule-calc__today .bnpl-schedule-calc__sum').innerHTML = `${firstPayment.toLocaleString(
                'ru-RU'
            )} <span>₽</span>`
        }

        if (isPaymentsCombined || numPayments > 4) {
            const getPaymentTemplate = function() {
                const interval = isWeeks ? weeksInterval : paymentsInterval
                return `<div class="bnpl-schedule-calc__part">
                    ${isPaymentsCombined ? getLinesTemplate(numRecPayments) : ''}
                    <div class="bnpl-schedule-calc__descr">Еще ${numRecPayments} ${getPaymentsFormatted(
                    numRecPayments
                )}  ${interval > 1 ? getEveryFormatted(interval) : 'раз в'} ${interval > 1 ? interval : ''} ${isWeeks ? getWeeksFormatted(interval) : getDaysFormatted(interval)}</div>
                    <div class="bnpl-schedule-calc__sum">по ${getPaymentAmount(recAmount.toFixed(2))}</div>
                </div>`
            }

            card.querySelector('.bnpl-schedule-calc').append(getElementFromTemplate(getPaymentTemplate()))
        } else {
            const getPaymentTemplate = (date) => `<div class="bnpl-schedule-calc__part">
                <div class="bnpl-schedule-calc__descr">${date}</div>
                <div class="bnpl-schedule-calc__sum">${recAmount.toLocaleString('ru-RU')} <span>₽</span></div>
            </div>`

            const dates = getDatesArr(numRecPayments, paymentsInterval, true)
            const paymentsFragment = new DocumentFragment()
            dates.forEach((date) => {
                paymentsFragment.append(getElementFromTemplate(getPaymentTemplate(date)))
            })
            card.querySelector('.bnpl-schedule-calc').append(paymentsFragment)
        }

        //////////
        // Открытие модального окна в виджетах с расписанием

        // recsPercents - процент от полной стоимости приходящийся на все рекуррентные платежи
        // recPercents - процент от полной стоимости, приходящийся на каждый рек. платеж в отдельности
        // numDays - все время рассрочки в днях
        const modalButton = card.querySelector('.bnpl-help-button')
        const recsPercents = 100 - firstPaymentPercents
        const recPercents = Number((recsPercents / numRecPayments).toFixed(2))
        const numDays = paymentsInterval * numRecPayments

        modalButton && modalButton.addEventListener('click', (event) => openBnplModal({
            firstPaymentPercents,
            recsPercents,
            recPercents,
            paymentsInterval,
            numDays,
            numRecPayments,
            isWeeks
        }))
    })

///////////////////////////
////// Вспомогательные функции
///////////////////////////

function getDictIndex(amount) {
    const lastSymbol = String(amount).slice(-1)
    const penultimateSymbol = String(amount).slice(-2, -1)

    if (penultimateSymbol === '1') {
        return 2
    } else if (lastSymbol === '1') {
        return 0
    } else if (['2', '3', '4'].find((itm) => itm === lastSymbol)) {
        return 1
    } else {
        return 2
    }
}

function getLinesTemplate(numRecs) {
    const isMany = numRecs > 3 && numRecs <= 5
    return `<div class="bnpl-schedule-calc__lines ${isMany ? 'bnpl-schedule-calc__lines--many' : ''}">
        ${numRecs <= 5 ? Array(numRecs).fill('<div></div>').join('') : '<div></div>'}
    </div>`
}

function getDatesArr(numRecs, interval, isFormatted = false) {
    let dates = Array(numRecs).fill()
    return dates.map((_, idx) => {
        const now = new Date()
        const date = now.setDate(now.getDate() + interval * (idx + 1))

        return isFormatted ? getDateWithMonth(date) : date
    })
}

function toNumber(string) {
    return Number(string.replace(/,/, '.'))
}

function getElementFromTemplate(template) {
    const newElement = document.createElement('div')
    newElement.innerHTML = template

    return newElement.children[0]
}

function checkWeeks(daysAmount) {
    return (daysAmount >= 7) && !(daysAmount % 7)
}

function getDaysFromNow(date) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const paymentDate = new Date(date)

    const days = Math.floor(
        (paymentDate.getTime() - today.getTime()) / 86400000
    )

    return `${days} ${getDaysFormatted(days)}`
}

function getPaymentAmount(amount) {
    const separateAmount = String(amount).split('.')
    return `${separateAmount[0].toLocaleString('ru-RU')}<span class="bnpl-kopecks">,${separateAmount[1]} ₽</span>`
}


// Функции "словари"
function getDateWithMonth(date) {
    const dateObj = new Date(date)
    const monthIdx = dateObj.getMonth()
    const day = dateObj.getDate()

    const DICT = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
    return `${day} ${DICT[monthIdx]}`
}

function getPaymentsFormatted(amount) {
    const DICT = ['платеж', 'платежа', 'платежей']

    return DICT[getDictIndex(amount)]
}

function getEveryFormatted(amount) {
    const DICT = ['каждую', 'каждые', 'каждые']

    return DICT[getDictIndex(amount)]
}

function getDaysFormatted(amount, isGenitive = false) {
    // isGenitive - слово должно быть в Родительном падеже?
    const DICT = isGenitive ? ['дня', 'дней', 'дней'] : ['день', 'дня', 'дней']

    return DICT[getDictIndex(amount)]
}

function getWeeksFormatted(amount, isGenitive = false) {
    // isGenitive - слово должно быть в Родительном падеже?
    const DICT = isGenitive ? ['недели', 'недель', 'недель'] : ['неделю', 'недели', 'недель']

    return DICT[getDictIndex(amount)]
}
})()
