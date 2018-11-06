exports.seed = function (knex) {
  // Deletes ALL existing entries
  return knex('models')
    .del()
    .then(function () {
      // Inserts seed entries
      return knex('models').insert([
        {
          id: 'mw-1',
          attribution: {
            author: 'KTH',
            url: 'http:/kth.se'
          },
          description:
            'Amet qui ea do adipisicing deserunt culpa. Ullamco dolor irure ea ut culpa reprehenderit reprehenderit sunt ad aute proident. Elit do Lorem culpa excepteur do consequat incididunt esse fugiat aute velit velit sint. Velit dolor magna occaecat nisi exercitation voluptate nostrud sit. Culpa sit id dolor proident et ea sunt mollit proident laboris cillum ullamco aute.',
          version: 'v1.0',
          name: 'Malawi OnSSET v1.0',
          updated_at: '2018-10-21'
        },
        {
          id: 'cg-1',
          attribution: {
            author: 'KTH',
            url: 'http:/kth.se'
          },
          description:
            'Magna et commodo minim id pariatur non voluptate mollit sit sit culpa eu ut cupidatat. Officia aliquip nisi dolor velit. Quis tempor in nulla officia cillum sit culpa ea id. Ea esse irure cillum non esse ullamco ipsum esse. Enim nulla magna ullamco aliqua esse dolore do incididunt nulla sint amet tempor.',
          name: 'Congo OnSSET v1.0',
          updated_at: '2018-10-12',
          version: 'v1.0'
        },
        {
          id: 'cg-2',
          attribution: {
            author: 'KTH',
            url: 'http:/kth.se'
          },
          description:
            'Nulla ullamco cupidatat nisi esse magna occaecat cupidatat occaecat proident in nisi. Dolore tempor eu aliquip nulla officia incididunt duis dolore laboris voluptate proident fugiat sunt. Laboris excepteur Lorem id laboris magna reprehenderit. Duis officia mollit nostrud labore voluptate ullamco ea non aliquip proident id proident sint. Lorem aute nisi cupidatat ullamco ea laborum fugiat id est.',
          name: 'Congo OnSSET v1.2',
          updated_at: '2018-10-25',
          version: 'v1.2'
        }
      ]);
    });
};
