import { Router, Request, Response } from 'express';
import multer from 'multer';
import prisma from '../lib/prisma.js';
import XLSX from 'xlsx';
import { addMonths } from '../utils/helpers.js';
import { requireRoles } from '../middleware/auth.js';
import { UserRole } from '../entities/User.js';
import { isValid } from 'date-fns';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const ROUNDING_TOLERANCE = 5.0; // Allow small rounding differences (in EGP)

/**
 * Parses a date from an Excel serial number or common string formats.
 * Accepts dates between years 2000 and 2050.
 */
function parseDate(dateVal: unknown): Date | null {
  if (dateVal === null || dateVal === undefined || dateVal === '') return null;

  try {
    // 1. Excel serial date number
    if (typeof dateVal === 'number') {
      if (isNaN(dateVal) || dateVal <= 0) return null;
      // Excel serial 1 = 1900-01-01; adjust for 1900 leap-year bug (epoch 1899-12-30)
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const ms = excelEpoch.getTime() + Math.round(dateVal * 86400000);
      const d = new Date(ms);
      if (isValid(d) && d.getUTCFullYear() >= 2000 && d.getUTCFullYear() <= 2050) {
        return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
      }
      return null;
    }

    const str = String(dateVal).trim();
    if (!str) return null;

    // 2. Delimited date strings: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY, DD.MM.YYYY
    const parts = str.split(/[-/\.]/).map(p => p.trim());
    if (parts.length === 3) {
      const p1 = parseInt(parts[0], 10);
      const p2 = parseInt(parts[1], 10);
      const p3 = parseInt(parts[2], 10);

      if (!isNaN(p1) && !isNaN(p2) && !isNaN(p3)) {
        let day: number, month: number, year: number;

        if (p3 >= 1000) {
          // Format: DD-MM-YYYY or MM-DD-YYYY
          year = p3;
          if (p1 > 12) {
            day = p1;
            month = p2;
          } else if (p2 > 12) {
            day = p2;
            month = p1;
          } else {
            // Default DD-MM-YYYY
            day = p1;
            month = p2;
          }
        } else if (p1 >= 1000) {
          // Format: YYYY-MM-DD
          year = p1;
          month = p2;
          day = p3;
        } else {
          // Two-digit year
          year = p3 < 50 ? 2000 + p3 : 1900 + p3;
          if (p1 > 12) {
            day = p1;
            month = p2;
          } else if (p2 > 12) {
            day = p2;
            month = p1;
          } else {
            day = p1;
            month = p2;
          }
        }

        if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 2000 && year <= 2050) {
          const d = new Date(year, month - 1, day);
          if (isValid(d) && d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) {
            return d;
          }
        }
      }
    }

    // 3. Fallback standard Date parse
    const fallback = new Date(str);
    if (isValid(fallback) && fallback.getFullYear() >= 2000 && fallback.getFullYear() <= 2050) {
      return fallback;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Parses numeric cell values, cleaning comma separators and whitespace.
 * Returns null if invalid or negative.
 */
function parseNumber(val: unknown, defaultValue: number | null = 0): number | null {
  if (val === null || val === undefined || val === '') {
    return defaultValue;
  }
  if (typeof val === 'number') {
    return isFinite(val) && val >= 0 ? val : null;
  }
  const cleanStr = String(val).replace(/,/g, '').trim();
  if (cleanStr === '') return defaultValue;
  const num = Number(cleanStr);
  return !isNaN(num) && isFinite(num) && num >= 0 ? num : null;
}

/**
 * Generates unique receipt numbers with entropy to prevent collisions across bulk imports.
 */
function generateReceiptNumber(prefix: string, rowNum: number, suffix = ''): string {
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  const time = Date.now().toString(36).toUpperCase();
  return `${prefix}-${time}-${rowNum}${suffix ? '-' + suffix : ''}-${rand}`;
}

router.post('/preview', requireRoles(UserRole.SUPER_ADMIN, UserRole.HQ_MANAGER, UserRole.BRANCH_MANAGER), upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'لم يتم رفع أي ملف' });
      return;
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 }) as unknown[][];

    if (data.length < 2) {
      res.status(400).json({ error: 'الملف فارغ أو لا يحتوي على صفوف بيانات' });
      return;
    }

    const headers = (data[0] as string[]).map(h => String(h || '').trim());
    const saleDateIdx = headers.findIndex(h => h.includes('تاريخ البيع') || h.toLowerCase().includes('sale date'));
    const lastDateIdx = headers.findIndex(h => h.includes('آخر قسط') || h.includes('آخر دفعة') || h.toLowerCase().includes('last payment'));

    const previewRows = [];
    const dateWarnings = [];

    // Parse up to 10 rows for preview
    for (let i = 1; i < Math.min(data.length, 11); i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      const saleDateStr = saleDateIdx >= 0 ? row[saleDateIdx] : '';
      const lastDateStr = lastDateIdx >= 0 ? row[lastDateIdx] : '';

      const parsedSale = parseDate(saleDateStr);
      const parsedLast = parseDate(lastDateStr);

      previewRows.push({
        rowNum: i + 1,
        saleDateOriginal: saleDateStr,
        saleDateParsed: parsedSale ? parsedSale.toISOString() : null,
        lastDateOriginal: lastDateStr,
        lastDateParsed: parsedLast ? parsedLast.toISOString() : null
      });

      if (saleDateStr && !parsedSale) dateWarnings.push(`السطر ${i + 1}: لم يتم التعرف على تاريخ البيع "${saleDateStr}"`);
      if (lastDateStr && !parsedLast) dateWarnings.push(`السطر ${i + 1}: لم يتم التعرف على تاريخ آخر قسط "${lastDateStr}"`);
    }

    res.json({ previewRows, dateWarnings });
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ error: 'فشل إنشاء معاينة للملف' });
  }
});

router.post('/excel', requireRoles(UserRole.SUPER_ADMIN, UserRole.HQ_MANAGER, UserRole.BRANCH_MANAGER), upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'لم يتم رفع أي ملف' });
      return;
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

    if (data.length < 2) {
      res.status(400).json({ error: 'الملف فارغ أو لا يحتوي على صفوف بيانات' });
      return;
    }

    const headers = (data[0] as string[]).map(h => String(h || '').trim());
    console.log('Raw Excel headers:', headers);

    const columnMap: Record<string, number> = {
      bkCode: headers.findIndex(h => h.includes('كود') || h.toLowerCase().includes('code')),
      customerType: headers.findIndex(h => h.includes('نوع') || h.toLowerCase().includes('type')),
      customerName: headers.findIndex(h => h.includes('اسم') || h.toLowerCase().includes('name')),
      department: headers.findIndex(h => h.includes('إدارة') || h.includes('الادارة') || h.toLowerCase().includes('department')),
      machineSerial: headers.findIndex(h => h.includes('سيريال') || h.toLowerCase().includes('serial')),
      saleDate: headers.findIndex(h => h.includes('تاريخ البيع') || h.toLowerCase().includes('sale date')),
      totalPrice: headers.findIndex(h => h.includes('قيمة العقد') || h.includes('السعر') || (h.includes('إجمالي') && !h.includes('محصلة') && !h.includes('أقساط')) || h.toLowerCase().includes('total price')),
      paidAmount: headers.findIndex(h => h.includes('محصلة') || h.includes('ما تم دفعه') || h.includes('المدفوع') || h.toLowerCase().includes('paid')),
      monthlyInstallment: headers.findIndex(h => h.includes('القسط الشهري') || h.includes('قيمة القسط') || h.toLowerCase().includes('monthly')),
      downPayment: headers.findIndex(h => h.includes('مقدم') || h.toLowerCase().includes('down')),
      months: headers.findIndex(h => (h.includes('عدد') && (h.includes('قسط') || h.includes('أقساط'))) || h.toLowerCase().includes('months')),
      lastPaymentDate: headers.findIndex(h => h.includes('آخر قسط مدفوع') || h.includes('آخر دفعة') || h.includes('آخر سداد') || h.includes('تاريخ السداد') || h.includes('آخر تحصيل') || h.toLowerCase().includes('last payment')),
      notes: headers.findIndex(h => h.includes('ملاحظات') || h.toLowerCase().includes('notes')),
    };

    console.log('Import Headers detected:', columnMap);

    if (
      columnMap.bkCode === -1 || 
      columnMap.customerName === -1 ||
      columnMap.machineSerial === -1 ||
      columnMap.saleDate === -1 ||
      columnMap.totalPrice === -1 ||
      columnMap.paidAmount === -1 ||
      columnMap.downPayment === -1 ||
      columnMap.months === -1 ||
      columnMap.monthlyInstallment === -1
    ) {
      const missing = [];
      if (columnMap.bkCode === -1) missing.push('كود العميل');
      if (columnMap.customerName === -1) missing.push('اسم العميل');
      if (columnMap.machineSerial === -1) missing.push('السيريال');
      if (columnMap.saleDate === -1) missing.push('تاريخ البيع');
      if (columnMap.totalPrice === -1) missing.push('قيمة العقد / الإجمالي');
      if (columnMap.paidAmount === -1) missing.push('إجمالي الأقساط المحصلة');
      if (columnMap.downPayment === -1) missing.push('المقدم');
      if (columnMap.months === -1) missing.push('عدد الأقساط');
      if (columnMap.monthlyInstallment === -1) missing.push('القسط الشهري');

      console.error('Missing mandatory columns:', missing);
      res.status(400).json({ error: `الملف ينقصه أعمدة إجبارية: ${missing.join('، ')}` });
      return;
    }

    const results = {
      customersCreated: 0,
      customersFound: 0,
      salesCreated: 0,
      installmentsCreated: 0,
      errors: [] as string[]
    };

    for (let i = 1; i < data.length; i++) {
      const row = data[i] as (string | number)[];
      if (!row || (!row[columnMap.bkCode] && !row[columnMap.customerName])) continue;

      const bkCode = String(row[columnMap.bkCode] || '').trim();
      const customerType = columnMap.customerType >= 0 ? String(row[columnMap.customerType] || 'عام').trim() : 'عام';
      const customerName = String(row[columnMap.customerName] || '').trim();
      const department = columnMap.department >= 0 ? String(row[columnMap.department] || '').trim() : '';
      const machineSerial = columnMap.machineSerial >= 0 ? String(row[columnMap.machineSerial] || '').trim() : '';

      // Numeric validations
      const totalPrice = parseNumber(row[columnMap.totalPrice], null);
      const paidAmount = parseNumber(row[columnMap.paidAmount], null);
      const downPayment = parseNumber(row[columnMap.downPayment], null);
      const monthlyInstallment = parseNumber(row[columnMap.monthlyInstallment], null);
      const rowMonths = parseNumber(row[columnMap.months], null);
      const notes = columnMap.notes >= 0 ? String(row[columnMap.notes] || '').trim() : '';

      // Check required text & numeric presence
      if (!bkCode || !customerName || !machineSerial) {
        results.errors.push(`السطر ${i + 1}: يوجد حقول إجبارية نصية فارغة (كود العميل، الاسم، أو السيريال)`);
        continue;
      }

      if (totalPrice === null || totalPrice <= 0) {
        results.errors.push(`السطر ${i + 1}: قيمة العقد غير صحيحة أو أقل من أو تساوي صفر`);
        continue;
      }

      if (paidAmount === null || downPayment === null || monthlyInstallment === null || rowMonths === null) {
        results.errors.push(`السطر ${i + 1}: قيم مالية غير صحيحة أو سالبة (المقدم، المحصل، القسط، أو عدد الأشهر)`);
        continue;
      }

      // Date validations
      const saleDateRaw = row[columnMap.saleDate];
      const saleDate = parseDate(saleDateRaw);
      if (!saleDate) {
        results.errors.push(`السطر ${i + 1}: تاريخ البيع غير صالح أو خارج النطاق ("${saleDateRaw || 'فارغ'}")`);
        continue;
      }

      const lastPaymentDateStr = columnMap.lastPaymentDate >= 0 ? row[columnMap.lastPaymentDate] : null;
      const lastPaymentDate = parseDate(lastPaymentDateStr);

      // Business logic validation
      const totalActualPaid = downPayment + paidAmount;
      if (totalActualPaid - totalPrice > ROUNDING_TOLERANCE) {
        results.errors.push(
          `السطر ${i + 1}: مجموع المدفوع (${totalActualPaid.toFixed(2)}) يتجاوز إجمالي العقد (${totalPrice.toFixed(2)}) بأكثر من حد السماح (${ROUNDING_TOLERANCE} ج.م)`
        );
        continue;
      }

      try {
        let customer = await prisma.customer.findFirst({
          where: { bkCode, customerType }
        });
        
        if (!customer) {
          customer = await prisma.customer.create({
            data: {
              bkCode,
              customerType,
              name: customerName,
              department: department || null,
              branchId: req.branchId || undefined,
            } as any
          });
          results.customersCreated++;
        } else {
          results.customersFound++;
        }

        const isCash = (rowMonths <= 0 && monthlyInstallment <= 0) || (downPayment >= totalPrice - ROUNDING_TOLERANCE);
        const remainingAfterAllPaid = Math.max(0, Math.round((totalPrice - totalActualPaid) * 100) / 100);

        let months = Math.round(rowMonths);
        if (!isCash && months <= 0 && monthlyInstallment > 0) {
          const toInstall = totalPrice - downPayment;
          months = Math.round(toInstall / monthlyInstallment);
          if (months === 0 && toInstall > 0) months = 1;
        }

        if (!isCash && months <= 0) {
          results.errors.push(`السطر ${i + 1}: عدد الأقساط غير محدد أو غير كافٍ لعملية التقسيط`);
          continue;
        }

        const receiptNumber = generateReceiptNumber('OLD', i + 1);

        const sale = await prisma.machineSale.create({
          data: {
            receiptNumber,
            customerId: customer.id,
            machineSerial,
            saleType: isCash ? 'CASH' : 'INSTALLMENT',
            totalPrice,
            downPayment,
            paidAmount: totalActualPaid,
            remainingAmount: remainingAfterAllPaid,
            paymentPlace: 'dhamen',
            notes: notes || 'مستورد من ملف قديم',
            saleDate,
            firstDueDate: !isCash && months > 0 ? addMonths(saleDate, 2) : undefined,
            months: isCash ? 0 : months,
            status: remainingAfterAllPaid <= 0.01 ? 'COMPLETED' : 'ACTIVE',
            branchId: req.branchId || (customer as any).branchId || undefined,
          } as any
        });

        results.salesCreated++;

        if (!isCash && months > 0) {
          const installments = [];
          const startDate = sale.firstDueDate ? new Date(sale.firstDueDate) : addMonths(saleDate, 2);
          let currentDate = new Date(startDate);
          
          const toInstall = Math.max(0, totalPrice - downPayment);
          const baseInstAmount = monthlyInstallment > 0 ? monthlyInstallment : Math.round((toInstall / months) * 100) / 100;
          
          let extraCash = paidAmount;
          let remainingToDistribute = toInstall;

          // Determine last paid installment index for attaching lastPaymentDate
          let tempExtra = paidAmount;
          let tempRemaining = toInstall;
          let lastPaidIndex = 0;
          for (let m = 1; m <= months; m++) {
            const fullAmount = m === months ? Math.round(tempRemaining * 100) / 100 : baseInstAmount;
            const applied = Math.min(tempExtra, fullAmount);
            if (applied > 0) {
              lastPaidIndex = m;
            }
            tempRemaining -= fullAmount;
            tempExtra -= applied;
          }

          for (let m = 1; m <= months; m++) {
            const fullAmount = m === months ? Math.round(remainingToDistribute * 100) / 100 : baseInstAmount;
            const appliedExtra = Math.min(extraCash, fullAmount);
            const isFullyPaidByExtra = appliedExtra >= fullAmount - 0.01;

            const instReceiptNumber = isFullyPaidByExtra ? generateReceiptNumber('PAY', i + 1, `INST-${m}`) : null;
            const instPaidDate = isFullyPaidByExtra 
              ? (m === lastPaidIndex && lastPaymentDate ? lastPaymentDate : new Date(currentDate)) 
              : null;

            let paymentId: string | null = null;
            if (appliedExtra > 0) {
              const createdPayment = await prisma.payment.create({
                data: {
                  receiptNumber: instReceiptNumber || generateReceiptNumber('PAY', i + 1, `PART-${m}`),
                  saleId: sale.id,
                  paymentType: 'INSTALLMENT',
                  amount: appliedExtra,
                  paymentPlace: 'dhamen',
                  notes: 'مستورد من ملف قديم (قسط)',
                  paidAt: instPaidDate || new Date(currentDate),
                }
              });
              paymentId = createdPayment.id;
            }

            installments.push({
              saleId: sale.id,
              installmentNo: m,
              dueDate: new Date(currentDate),
              amount: Math.round(fullAmount * 100) / 100,
              paidAmount: isFullyPaidByExtra ? fullAmount : appliedExtra,
              isPaid: isFullyPaidByExtra,
              isWaived: false,
              waiveReason: null,
              paidDate: instPaidDate,
              receiptNumber: instReceiptNumber,
              paymentId,
            });

            remainingToDistribute -= fullAmount;
            extraCash -= appliedExtra;
            currentDate = addMonths(currentDate, 1);
          }

          await prisma.installment.createMany({ data: installments });
          results.installmentsCreated += installments.length;
        }

        // Record initial payments
        if (totalActualPaid > 0) {
          if (isCash) {
            await prisma.payment.create({
              data: {
                receiptNumber: generateReceiptNumber('PAY', i + 1, 'CASH'),
                saleId: sale.id,
                paymentType: 'CASH_SALE',
                amount: totalActualPaid,
                paymentPlace: 'dhamen',
                notes: 'مستورد من ملف قديم (كاش)',
                paidAt: lastPaymentDate || saleDate,
              }
            });
          } else if (downPayment > 0) {
            await prisma.payment.create({
              data: {
                receiptNumber: generateReceiptNumber('PAY', i + 1, 'DP'),
                saleId: sale.id,
                paymentType: 'DOWN_PAYMENT',
                amount: downPayment,
                paymentPlace: 'dhamen',
                notes: 'مستورد من ملف قديم (مقدم)',
                paidAt: saleDate,
              }
            });
          }
        }

      } catch (err) {
        results.errors.push(`السطر ${i + 1}: ${err instanceof Error ? err.message : 'خطأ غير معروف'}`);
      }
    }

    res.json({
      success: true,
      message: 'تم استيراد البيانات بنجاح',
      results
    });

  } catch (error) {
    console.error('Excel import error:', error);
    res.status(500).json({ error: 'فشل استيراد ملف الإكسيل' });
  }
});

router.get('/template', async (req: Request, res: Response) => {
  const template = [
    ['كود العميل', 'نوع العميل', 'الإدارة', 'اسم العميل', 'السيريال', 'تاريخ البيع القديم', 'إجمالي قيمة العقد', 'إجمالي الأقساط المحصلة', 'المقدم', 'عدد الأقساط', 'قيمة القسط الشهري', 'تاريخ آخر قسط مدفوع', 'ملاحظات'],
    ['C001', 'مخبز', 'إدارة 1', 'أحمد محمد', 'SN123456', '01-01-2024', '10000', '5000', '3000', '7', '1000', '15-03-2024', 'ملاحظة اختيارية'],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(template);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=template.xlsx');
  res.send(buffer);
});

export default router;